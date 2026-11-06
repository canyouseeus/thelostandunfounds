import type { VercelRequest, VercelResponse } from '@vercel/node';
import sendPayouts from '../../lib/api-handlers/affiliates/send-payouts.js';

/**
 * Cron: pay approved affiliate commissions to their Stripe Connect accounts.
 * Schedule: hourly (configured in vercel.json), same as crew-payouts.
 *
 * Hourly because the gate is Stripe settling the client's payment, which
 * happens at an arbitrary hour. A run with nothing due exits after one query.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return sendPayouts(req, res);
}
