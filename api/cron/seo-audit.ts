import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js';
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';
import { advanceAudit, createRun, latestRun } from '../../lib/seo-audit/store.js';

/**
 * Daily site audit: crawls www.thelostandunfounds.com and stores what it finds
 * for Admin → SEO (see lib/seo-audit/).
 *
 * vercel.json fires this every 10 minutes from 08:00 to 08:50 UTC (2:00–2:50 AM
 * CST). The first call starts a run; each call works for up to ~4 minutes and
 * saves its place, so a large crawl simply spreads over several calls. Once
 * today's run is done, the remaining calls return at once.
 *
 * Only Vercel's scheduler (CRON_SECRET) can call it.
 */

// vercel.json gives this function 300 s; stop well short of it.
const BUDGET_MS = 240_000;
// A finished run newer than this counts as today's.
const MIN_GAP_MS = 20 * 60 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const deadline = Date.now() + BUDGET_MS;

    try {
        const db = getSupabaseAdmin();
        let run = await latestRun(db);

        if (run?.status !== 'running') {
            const recent = run && Date.now() - new Date(run.started_at).getTime() < MIN_GAP_MS;
            if (recent && req.query.force !== '1') {
                return res.status(200).json({ skipped: true, reason: `Last run ${run!.id} started ${run!.started_at}` });
            }
            run = await createRun(db, 'cron');
        }

        const result = await advanceAudit(db, run, deadline);
        console.log('[seo-audit]', JSON.stringify(result));
        return res.status(200).json(result);
    } catch (err: any) {
        console.error('[seo-audit] failed', err);
        return res.status(500).json({ error: err?.message || 'SEO audit failed' });
    }
}
