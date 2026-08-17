import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSiteOrigin } from './_stripe-client.js';
import { verifyOnboardingToken } from './_onboarding-token.js';
import {
  getSupabaseAdmin,
  findAffiliateById,
  ensureStripeAccount,
  createOnboardingLink,
} from './_connect-account.js';

/**
 * GET /api/affiliates/stripe-resume?token=...
 *
 * One-click Stripe onboarding straight from a reminder email. Verifies the
 * signed token, ensures the affiliate has an Express account, mints a fresh
 * Account Link (they expire in minutes, so it must happen here, not in the
 * email) and 302s the affiliate to Stripe.
 *
 * No login required: the token is the authorisation, and all it can do is
 * open Stripe's own KYC flow for one affiliate.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = getSiteOrigin(
    req.headers.host as string | undefined,
    req.headers['x-forwarded-proto'] as string | undefined
  );

  const fail = (reason: string) => {
    console.warn('[stripe-resume] rejected:', reason);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage(origin, reason));
  };

  const verdict = verifyOnboardingToken(req.query.token);
  if (!verdict.ok || !verdict.affiliateId) return fail(verdict.reason || 'invalid link');

  try {
    const supabase = getSupabaseAdmin();
    const affiliate = await findAffiliateById(supabase, verdict.affiliateId);
    if (!affiliate) return fail('affiliate not found');

    const { accountId } = await ensureStripeAccount(supabase, affiliate);
    const link = await createOnboardingLink(
      accountId,
      origin,
      '/affiliate-dashboard?stripe=connected',
      '/affiliate-dashboard?stripe=refresh'
    );

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.redirect(302, link.url);
  } catch (err: any) {
    console.error('[stripe-resume] error:', err?.message || err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(errorPage(origin, 'could not reach Stripe'));
  }
}

function errorPage(origin: string, reason: string): string {
  const safeReason = String(reason).replace(/[<>&"]/g, '');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#000;color:#fff;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:80px 24px;">
    <h1 style="font-size:22px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px 0;">LINK NO LONGER VALID</h1>
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px 0;">
      We couldn't start your Stripe setup from this link (${safeReason}). Sign in to your affiliate
      dashboard and use the CONNECT STRIPE button there; it does exactly the same thing.
    </p>
    <a href="${origin}/affiliate-dashboard" style="display:inline-block;padding:14px 28px;background:#fff;color:#000;font-weight:bold;font-size:14px;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">Open dashboard</a>
  </div>
</body></html>`;
}
