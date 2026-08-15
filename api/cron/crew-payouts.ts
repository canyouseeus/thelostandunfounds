import type { VercelRequest, VercelResponse } from '@vercel/node';
import sendPayouts from '../../lib/api-handlers/crew/send-payouts.js';

/**
 * Cron: pay settled crew (job) payouts to their Stripe Connect accounts.
 * Schedule: hourly (configured in vercel.json).
 *
 * Hourly rather than daily because the gate is Stripe settling the client's
 * payment, which happens at an arbitrary hour. Every guard lives in the
 * handler, so a run with nothing due, the usual case, costs one balance
 * lookup and exits.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return sendPayouts(req, res);
}
