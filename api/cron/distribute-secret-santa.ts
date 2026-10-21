import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js';
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Secret Santa — Dec 25 (vercel.json cron), Central time.
 *
 * The `distribute_secret_santa` SQL function splits the year's pot among
 * active affiliates WEIGHTED BY REWARD POINTS earned that year, writes each
 * share as a payable commission, carries cent rounding into next year's pot,
 * and marks the pot distributed. It refuses before Dec 25 and pays a year once.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const year = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 4));
  const { data, error } = await getSupabaseAdmin().rpc('distribute_secret_santa', { p_year: year });
  if (error) {
    console.error('[secret-santa] distribution failed:', error.message);
    return res.status(500).json({ error: error.message, year });
  }
  console.log('[secret-santa] distribution:', JSON.stringify(data));
  return res.status(200).json(data);
}
