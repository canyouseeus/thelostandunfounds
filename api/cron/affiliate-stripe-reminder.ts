import type { VercelRequest, VercelResponse } from '@vercel/node';
import stripeReminders from '../../lib/api-handlers/affiliates/stripe-reminders.js';

/**
 * Cron: nudge affiliates who signed up but never connected Stripe.
 * Schedule: daily at 16:00 UTC (configured in vercel.json).
 *
 * The cadence guards (24h grace, 7-day cooldown, 4-reminder cap) live in the
 * handler, so a daily run only actually mails anyone who is due.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return stripeReminders(req, res);
}
