import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStripe, getSiteOrigin } from './_stripe-client.js';
import { sendAffiliateEmail } from './_emails.js';

/**
 * Stripe Connect onboarding for affiliates.
 *
 *  POST /api/affiliates/connect-onboarding
 *    body: { userId, affiliateCode?, returnPath?, refreshPath? }
 *  - Creates a Stripe Connect Express account if the affiliate doesn't have one.
 *  - Returns an Account Link URL the affiliate can open to complete KYC.
 *
 *  GET /api/affiliates/connect-onboarding?userId=...
 *  - Refreshes account status from Stripe and returns the latest fields.
 */

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findAffiliate(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('affiliates')
    .select('id, user_id, code, affiliate_code, stripe_account_id, stripe_account_status, status, total_earnings')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getUserEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Diagnostic: log env var presence on every request (no secrets exposed)
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[connect-onboarding] env check:', {
    stripe: stripeKey ? `${stripeKey.slice(0, 7)}...` : 'MISSING',
    supabaseUrl: supabaseUrl ? 'set' : 'MISSING',
    supabaseKey: supabaseKey ? `${supabaseKey.slice(0, 10)}...` : 'MISSING',
  });

  let supabase: SupabaseClient;
  try {
    supabase = getSupabase();
  } catch (err: any) {
    console.error('[connect-onboarding] supabase init failed:', err?.message);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const userId = (req.method === 'POST' ? req.body?.userId : req.query.userId) as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const affiliate = await findAffiliate(supabase, userId);
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });

    // GET → just refresh status from Stripe
    if (req.method === 'GET') {
      if (!affiliate.stripe_account_id) {
        // No Stripe account yet — don't even initialize the Stripe client.
        // This lets the dashboard render for legacy affiliates even if the
        // server hasn't been configured with STRIPE_SECRET_KEY yet.
        return res.status(200).json({
          onboarded: false,
          status: 'pending',
          stripe_account_id: null,
          message: 'No Stripe Connect account yet'
        });
      }
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(affiliate.stripe_account_id);
      const status = computeStatus(account);
      await persistStatus(supabase, affiliate.id, account, status);
      return res.status(200).json({
        onboarded: account.details_submitted && account.payouts_enabled,
        status,
        stripe_account_id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements?.currently_due || [],
      });
    }

    // POST → ensure account, return onboarding link
    const stripe = getStripe();
    let accountId = affiliate.stripe_account_id;
    let isNewAccount = false;

    if (!accountId) {
      const email = await getUserEmail(supabase, userId);
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          affiliate_id: affiliate.id,
          affiliate_code: affiliate.code || affiliate.affiliate_code || '',
          user_id: userId,
        },
      });
      accountId = account.id;
      isNewAccount = true;

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
        console.error('[connect-onboarding] failed to persist account id:', updErr);
      }

      // Mirror onto payout settings so payout requests can find the account.
      // affiliate_payout_settings has a UNIQUE constraint on affiliate_id (not user_id),
      // and paypal_email is still NOT NULL on legacy schemas — supply '' so the
      // row can be created for Stripe-only affiliates.
      await supabase
        .from('affiliate_payout_settings')
        .upsert(
          {
            affiliate_id: affiliate.id,
            stripe_account_id: account.id,
            payout_method: 'stripe',
            payment_threshold: 10,
            paypal_email: '',
          },
          { onConflict: 'affiliate_id' }
        );
    }

    const origin = getSiteOrigin(req.headers.host as string | undefined, req.headers['x-forwarded-proto'] as string | undefined);
    const returnPath = sanitizePath(req.body?.returnPath, '/affiliate-dashboard?stripe=connected');
    const refreshPath = sanitizePath(req.body?.refreshPath, '/affiliate-dashboard?stripe=refresh');

    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${origin}${refreshPath}`,
      return_url: `${origin}${returnPath}`,
      type: 'account_onboarding',
    });

    // Best-effort welcome email on first account creation
    if (isNewAccount) {
      try {
        const email = await getUserEmail(supabase, userId);
        if (email) {
          await sendAffiliateEmail({
            type: 'welcome',
            affiliateId: affiliate.id,
            referenceId: accountId!,
            to: email,
            data: {
              code: affiliate.code || affiliate.affiliate_code || '',
              onboardingUrl: link.url,
            },
          });
        }
      } catch (emailErr: any) {
        console.warn('[connect-onboarding] welcome email failed:', emailErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      stripe_account_id: accountId,
      onboarding_url: link.url,
      expires_at: link.expires_at,
      is_new: isNewAccount,
    });
  } catch (err: any) {
    console.error('[connect-onboarding] error:', err?.message || err);
    console.error('[connect-onboarding] error type:', err?.type, 'code:', err?.code, 'statusCode:', err?.statusCode);
    return res.status(500).json({
      error: 'Failed to create onboarding link',
      message: err?.message || 'Unknown error',
    });
  }
}

function sanitizePath(input: any, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  if (!input.startsWith('/')) return fallback;
  if (input.startsWith('//')) return fallback;
  if (!/^\/[A-Za-z0-9/_\-?=&%.]*$/.test(input)) return fallback;
  return input;
}

function computeStatus(account: any): 'pending' | 'restricted' | 'active' | 'rejected' {
  if (account.requirements?.disabled_reason?.startsWith('rejected')) return 'rejected';
  if (account.payouts_enabled && account.charges_enabled) return 'active';
  if (account.details_submitted) return 'restricted';
  return 'pending';
}

async function persistStatus(
  supabase: SupabaseClient,
  affiliateId: string,
  account: any,
  status: string
) {
  const updates: Record<string, any> = {
    stripe_account_status: status,
    stripe_charges_enabled: account.charges_enabled,
    stripe_payouts_enabled: account.payouts_enabled,
    stripe_details_submitted: account.details_submitted,
  };
  if (status === 'active' && account.payouts_enabled) {
    updates.stripe_onboarded_at = new Date().toISOString();
  }
  await supabase.from('affiliates').update(updates).eq('id', affiliateId);
}
