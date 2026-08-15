import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from './_stripe-client.js';

/**
 * Shared Stripe Connect account helpers.
 *
 * Extracted from connect-onboarding.ts so that every path which needs to put an
 * affiliate in front of Stripe onboarding (the dashboard button, the email
 * reminder resume link) creates *at most one* Express account per affiliate.
 * Duplicating the create call would strand commissions on an orphan account.
 */

export interface AffiliateRow {
  id: string;
  user_id: string;
  code: string | null;
  affiliate_code: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  status: string | null;
  total_earnings?: number | null;
}

export const AFFILIATE_SELECT =
  'id, user_id, code, affiliate_code, stripe_account_id, stripe_account_status, status, total_earnings';

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function findAffiliateByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<AffiliateRow | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select(AFFILIATE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AffiliateRow) || null;
}

export async function findAffiliateById(
  supabase: SupabaseClient,
  affiliateId: string
): Promise<AffiliateRow | null> {
  const { data, error } = await supabase
    .from('affiliates')
    .select(AFFILIATE_SELECT)
    .eq('id', affiliateId)
    .maybeSingle();
  if (error) throw error;
  return (data as AffiliateRow) || null;
}

export async function getUserEmail(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

/**
 * Return the affiliate's Stripe Connect account id, creating the Express
 * account (and mirroring it onto payout settings) the first time.
 */
export async function ensureStripeAccount(
  supabase: SupabaseClient,
  affiliate: AffiliateRow
): Promise<{ accountId: string; isNew: boolean }> {
  if (affiliate.stripe_account_id) {
    return { accountId: affiliate.stripe_account_id, isNew: false };
  }

  const stripe = getStripe();
  const email = await getUserEmail(supabase, affiliate.user_id);
  const account = await stripe.accounts.create({
    type: 'express',
    email: email || undefined,
    // Both capabilities, even though nothing here ever charges a card on a
    // connected account. Requesting `transfers` *without* `card_payments`
    // reads like the leaner ask, and it is, but Stripe only permits that
    // combination for platforms it has specifically approved, and rejects
    // account creation outright otherwise:
    //
    //   "Your platform needs approval for accounts to have requested the
    //    `transfers` capability without the `card_payments` capability."
    //
    // That error surfaces as a contractor who cannot connect at all, which is
    // far worse than a longer form. Do not drop `card_payments` again without
    // first getting that approval from Stripe support.
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.code || affiliate.affiliate_code || '',
      user_id: affiliate.user_id,
    },
  });

  const { error: updErr } = await supabase
    .from('affiliates')
    .update({
      stripe_account_id: account.id,
      stripe_account_status: 'pending',
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
    })
    .eq('id', affiliate.id);
  if (updErr) {
    console.error('[connect-account] failed to persist account id:', updErr);
  }

  // Mirror onto payout settings so payout requests can find the account.
  // affiliate_payout_settings has a UNIQUE constraint on affiliate_id (not user_id),
  // and paypal_email is still NOT NULL on legacy schemas; supply '' so the
  // row can be created for Stripe-only affiliates.
  await supabase.from('affiliate_payout_settings').upsert(
    {
      affiliate_id: affiliate.id,
      stripe_account_id: account.id,
      payout_method: 'stripe',
      payment_threshold: 10,
      paypal_email: '',
    },
    { onConflict: 'affiliate_id' }
  );

  return { accountId: account.id, isNew: true };
}

/**
 * Mint a fresh Stripe Account Link. These expire after a few minutes, so one
 * must be created at the moment the affiliate is about to be redirected,
 * never baked into an email.
 */
export async function createOnboardingLink(
  accountId: string,
  origin: string,
  returnPath: string,
  refreshPath: string
): Promise<{ url: string; expires_at: number }> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}${refreshPath}`,
    return_url: `${origin}${returnPath}`,
    type: 'account_onboarding',
    // Collect only what Stripe needs to enable payouts now, instead of
    // everything it will eventually want. Someone who already has a Stripe
    // account and signs in during onboarding usually sees a confirmation
    // screen and nothing else.
    collection_options: { fields: 'currently_due' },
  });
  return { url: link.url, expires_at: link.expires_at };
}

export function sanitizePath(input: any, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  if (!/^\/[A-Za-z0-9/_\-?=&%.]*$/.test(input)) return fallback;
  return input;
}

/**
 * `active` means "we can pay this person", nothing more.
 *
 * This used to also require `charges_enabled`. We do still request
 * `card_payments`, Stripe rejects the account outright otherwise, so that
 * test usually passes, but it is the wrong question: charges are a capability
 * this platform never exercises, and an account can have payouts enabled while
 * card processing sits in review. Gating on it would show a red badge, and
 * withhold the `stripe_onboarded_at` stamp, from someone Stripe is perfectly
 * happy to pay.
 */
export function computeStatus(
  account: any
): 'pending' | 'restricted' | 'active' | 'rejected' {
  if (account.requirements?.disabled_reason?.startsWith('rejected')) return 'rejected';
  if (account.payouts_enabled) return 'active';
  if (account.details_submitted) return 'restricted';
  return 'pending';
}

export async function persistStatus(
  supabase: SupabaseClient,
  affiliateId: string,
  account: any,
  status: string
): Promise<void> {
  const updates: Record<string, any> = {
    stripe_account_status: status,
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_details_submitted: account.details_submitted,
  };
  if (status === 'active' && account.payouts_enabled) {
    updates.stripe_onboarded_at = new Date().toISOString();
  } else {
    // Clear it when payouts are not enabled. Onboarding is not a one-way door:
    // an account can be disconnected and rebuilt (someone who signed up under
    // the wrong email, say), and a stamp that only ever gets written leaves the
    // row claiming an onboarding date for an account that no longer exists.
    updates.stripe_onboarded_at = null;
  }
  await supabase.from('affiliates').update(updates).eq('id', affiliateId);
}
