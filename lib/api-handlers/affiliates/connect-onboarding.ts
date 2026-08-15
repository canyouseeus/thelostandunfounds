import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '@supabase/supabase-js';
import { getStripe, getSiteOrigin } from './_stripe-client.js';
import { sendAffiliateEmail } from './_emails.js';
import {
  getSupabaseAdmin,
  findAffiliateByUserId,
  getUserEmail,
  ensureStripeAccount,
  createOnboardingLink,
  sanitizePath,
  computeStatus,
  persistStatus,
} from './_connect-account.js';

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
 *
 * The account/link primitives live in _connect-account.ts so the email
 * reminder's resume link (stripe-resume.ts) shares them.
 */

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
    supabase = getSupabaseAdmin();
  } catch (err: any) {
    console.error('[connect-onboarding] supabase init failed:', err?.message);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const userId = (req.method === 'POST' ? req.body?.userId : req.query.userId) as string | undefined;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const affiliate = await findAffiliateByUserId(supabase, userId);
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });

    // GET → just refresh status from Stripe
    if (req.method === 'GET') {
      if (!affiliate.stripe_account_id) {
        // No Stripe account yet: don't even initialize the Stripe client.
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
    const { accountId, isNew } = await ensureStripeAccount(supabase, affiliate);

    const origin = getSiteOrigin(req.headers.host as string | undefined, req.headers['x-forwarded-proto'] as string | undefined);
    const returnPath = sanitizePath(req.body?.returnPath, '/affiliate-dashboard?stripe=connected');
    const refreshPath = sanitizePath(req.body?.refreshPath, '/affiliate-dashboard?stripe=refresh');

    const link = await createOnboardingLink(accountId, origin, returnPath, refreshPath);

    // Best-effort welcome email on first account creation
    if (isNew) {
      try {
        const email = await getUserEmail(supabase, userId);
        if (email) {
          await sendAffiliateEmail({
            type: 'welcome',
            affiliateId: affiliate.id,
            referenceId: accountId,
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
      is_new: isNew,
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
