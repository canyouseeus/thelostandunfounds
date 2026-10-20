import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Retired: POST /api/affiliates/calculate-commission
 *
 * This was a second commission path — and an unauthenticated one: any caller
 * could post an email and a profit figure and have commissions, MLM earnings,
 * reward points and Secret Santa contributions written for it. Nothing in the
 * site called it.
 *
 * The split it computed (42% / 2% / 1% of profit, King Midas 8%, Secret Santa
 * 3%, 1 point per $10) now lives in the `register_referral_conversion` RPC,
 * reached through triggerReferralCommission() in _commission-trigger.ts and
 * only from server-side payment handlers.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: 'Gone. Commissions are recorded by the payment webhooks, not by request.',
  });
}
