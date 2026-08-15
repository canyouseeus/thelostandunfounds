import type { VercelRequest, VercelResponse } from '@vercel/node';
import stripeReminders from '../../lib/api-handlers/affiliates/stripe-reminders.js';

/**
 * Cron: nudge affiliates who signed up but never connected Stripe.
 * Schedule: hourly (configured in vercel.json).
 *
 * The cadence guards (24h grace, 7-day cooldown, 4-reminder cap) live in the
 * handler, so an hourly run only actually mails whoever is due, usually
 * nobody. Running hourly rather than daily just means a new signup gets their
 * first nudge promptly once the grace period ends, instead of waiting for a
 * fixed time of day.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return stripeReminders(req, res);
}
