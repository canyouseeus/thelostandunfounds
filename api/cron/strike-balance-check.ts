import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runStrikeBalanceCheck } from '../../lib/api-handlers/_strike-balance-check.js';
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Once a day at 16:00 UTC (10 AM CST, 11 AM CDT): email the owner's Gmail his
 * Strike USD balance. Read only. See lib/api-handlers/_strike-balance-check.ts.
 * Behind CRON_SECRET. GET ?dryRun=1 reads the balance and sends nothing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true';
  try {
    const result = await runStrikeBalanceCheck({ dryRun });
    console.log(
      '[strike-balance-check]',
      JSON.stringify({ dryRun, day: result.day, sent: result.sent, pending: result.balance.pending > 0 })
    );
    return res.status(200).json({ ok: true, dryRun, ...result });
  } catch (err: any) {
    console.error('[strike-balance-check] failed:', err?.message);
    return res.status(500).json({ ok: false, error: err?.message || 'unknown error' });
  }
}
