import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';
import { runProdigiSubmissions } from '../../lib/api-handlers/_prodigi-fulfillment.js';

/**
 * Cron: send paid print orders to Prodigi once the customer's money is ours.
 * Schedule: hourly (configured in vercel.json).
 *
 * Prodigi charges the owner's card when an order is created, so nothing is
 * submitted until the order's Stripe charge has settled and the available
 * balance covers it. `?dryRun=1` reports what would be submitted.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true';
    const summary = await runProdigiSubmissions(getSupabaseAdmin(), { dryRun });
    return res.status(200).json({ success: true, dryRun, ...summary });
  } catch (err: any) {
    console.error('[prodigi-orders] run failed:', err?.message);
    return res.status(500).json({ error: 'Prodigi submission run failed', message: err?.message });
  }
}
