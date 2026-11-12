import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runZohoGmailCopy } from '../../lib/api-handlers/_zoho-gmail-copy.js';
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Every 30 minutes: copy recent mail from COPY_SENDER_DOMAINS (Capitol Crew
 * first) out of the Zoho mailbox into the owner's Gmail, so routines that can
 * only read Gmail see it. See lib/api-handlers/_zoho-gmail-copy.ts.
 *
 * Behind CRON_SECRET (Vercel's scheduler sends it as a bearer token).
 * GET ?dryRun=1 lists what would be copied and sends nothing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true';

  try {
    const summary = await runZohoGmailCopy({ dryRun });
    const counts = summary.results.reduce<Record<string, number>>((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] || 0) + 1;
      return acc;
    }, {});
    console.log('[zoho-gmail-copy] run', JSON.stringify({ dryRun, counts, results: summary.results.map((r) => ({ id: r.messageId, outcome: r.outcome, error: r.error })) }));
    const failed = counts.failed || 0;
    return res.status(failed > 0 ? 500 : 200).json({ ok: failed === 0, dryRun, counts, ...summary });
  } catch (err: any) {
    console.error('[zoho-gmail-copy] run failed:', err?.message);
    return res.status(500).json({ ok: false, error: err?.message || 'unknown error' });
  }
}
