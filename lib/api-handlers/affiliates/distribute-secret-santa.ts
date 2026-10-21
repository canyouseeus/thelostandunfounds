import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_booking-payment-utils.js';
import { verifyAdmin } from '../_admin-auth.js';

/**
 * Distribute a year's Secret Santa pot — POST /api/affiliates/distribute-secret-santa
 * Body: { year }
 *
 * Admin only. This route used to run with no auth check at all. The split is
 * done by the `distribute_secret_santa` SQL function (points-weighted, refuses
 * before Dec 25, pays a year once) — the same one the Dec 25 cron calls.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!(await verifyAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const year = Number((req.body || {}).year);
  if (!Number.isInteger(year)) {
    return res.status(400).json({ error: 'year required' });
  }

  const { data, error } = await getSupabaseAdmin().rpc('distribute_secret_santa', { p_year: year });
  if (error) {
    return res.status(400).json({ error: error.message, year });
  }
  return res.status(200).json(data);
}
