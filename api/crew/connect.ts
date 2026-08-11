import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe, getSiteOrigin } from '../../lib/api-handlers/affiliates/_stripe-client.js';
import {
  getSupabaseAdmin,
  resolveUserId,
  resolveConnectAccount,
  PHOTOGRAPHER_SELECT,
  type PhotographerRow,
} from '../../lib/api-handlers/crew/_shared.js';

/**
 * Connect a contractor's Stripe account, or report how far along they are.
 *
 * Before this route there was no way for a contractor to connect Stripe from
 * their own dashboard at all: the page offered "open my Stripe dashboard",
 * which is only mintable *after* an account exists, so anyone who had not
 * already onboarded through the affiliate flow hit a dead end and had to be
 * walked through it by hand. Onboarding now starts from the same page the
 * payout email points at.
 *
 *  GET  → { connected, status, payouts_enabled, requirements, ... }
 *  POST → { url } — a fresh Account Link to open
 *
 * Auth is the verified Supabase JWT (see `resolveUserId`). The contractor is
 * looked up from the verified user id, so a caller cannot start onboarding
 * against — or read the status of — somebody else's account.
 *
 * Two things make this materially shorter for someone who already has Stripe:
 *
 *  1. An affiliate account is reused rather than duplicated (via
 *     `resolveConnectAccount`), so crew who signed up as affiliates first are
 *     already done and never see an onboarding form.
 *  2. We request `transfers` only. `card_payments` — which the affiliate flow
 *     used to ask for as well — is the capability for *accepting* card
 *     payments, and Stripe gates it behind a much longer questionnaire
 *     (business URL, product description, statement descriptor, industry).
 *     Nothing on this platform charges cards on a connected account; every
 *     payout is a transfer from the platform balance. Asking for a capability
 *     we never use bought nothing and cost the contractor a form.
 *
 * The Account Link is created with `collection_options.fields: 'currently_due'`
 * so Stripe collects only what it needs to enable payouts now, rather than
 * everything it will eventually want. For an existing Stripe user who signs in
 * during onboarding, that is usually a confirmation screen and nothing else.
 */

const DASHBOARD_PATH = '/photographer-dashboard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to set up your payouts.' });

  try {
    const supabase = getSupabaseAdmin();

    const { data: photographer } = await supabase
      .from('photographers')
      .select(PHOTOGRAPHER_SELECT)
      .eq('user_id', userId)
      .maybeSingle();

    if (!photographer) {
      return res.status(404).json({
        error: 'No contractor record found for this account.',
        code: 'NOT_A_CONTRACTOR',
      });
    }

    const row = photographer as PhotographerRow;
    const { accountId } = await resolveConnectAccount(supabase, row);

    if (req.method === 'GET') {
      if (!accountId) {
        return res.status(200).json({
          connected: false,
          status: 'not_started',
          payouts_enabled: false,
          details_submitted: false,
          requirements: [],
        });
      }

      const account = await getStripe().accounts.retrieve(accountId);
      const requirements = account.requirements?.currently_due || [];
      return res.status(200).json({
        connected: true,
        // `active` = money can actually move. `restricted` = they started (or
        // Stripe wants more) and payouts are still blocked, which is the state
        // worth shouting about on the dashboard.
        status: account.payouts_enabled
          ? 'active'
          : account.details_submitted
            ? 'restricted'
            : 'pending',
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
        requirements,
      });
    }

    // POST → make sure an account exists, then mint a link into onboarding.
    let targetAccountId = accountId;

    if (!targetAccountId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        email: row.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        business_profile: {
          // Prefilled so Stripe stops asking the contractor to describe a
          // business they do not think of themselves as running.
          product_description: 'Photography and videography services',
        },
        metadata: {
          photographer_id: row.id,
          user_id: userId,
          source: 'crew_dashboard',
        },
      });
      targetAccountId = account.id;

      const { error: updErr } = await supabase
        .from('photographers')
        .update({ stripe_account_id: account.id })
        .eq('id', row.id);
      if (updErr) {
        // Losing the id would strand the account and create a second one on
        // the next click, so this is loud even though the link still works.
        console.error('[crew/connect] failed to persist account id:', updErr.message);
      }
    }

    const origin = getSiteOrigin(
      req.headers.host as string | undefined,
      req.headers['x-forwarded-proto'] as string | undefined
    );

    const link = await getStripe().accountLinks.create({
      account: targetAccountId,
      refresh_url: `${origin}${DASHBOARD_PATH}?stripe=refresh`,
      return_url: `${origin}${DASHBOARD_PATH}?stripe=connected`,
      type: 'account_onboarding',
      collection_options: { fields: 'currently_due' },
    });

    return res.status(200).json({
      url: link.url,
      expires_at: link.expires_at,
      stripe_account_id: targetAccountId,
    });
  } catch (err: any) {
    console.error('[crew/connect] failed:', err?.message);
    return res.status(500).json({
      error: 'Could not start Stripe setup.',
      message: err?.message,
    });
  }
}
