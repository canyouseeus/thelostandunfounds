/**
 * Continue the retrograde rename, server-side, until there is nothing left.
 *
 * The admin button drives this from the browser, which means the run only
 * survives as long as the tab is awake — a phone locking its screen suspends
 * the loop mid-migration. That is a poor thing to ask of anyone for a job that
 * takes an hour, so the same work runs here on a schedule instead.
 *
 * Each firing does one bounded pass and returns. Nothing is renamed unless
 * there is work to do, so once the archive is converted this becomes a cheap
 * no-op: one query, zero Drive calls.
 *
 * Attribution is enforced by retrogradeRename itself — a library whose
 * photographer_handle is NULL is skipped and reported, never renamed under
 * somebody else's handle. That guarantee has to hold here more than anywhere,
 * because no one is watching this run.
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { retrogradeRename } from '../../lib/api-handlers/_retrograde-rename.js';

// Under the 300s function ceiling declared in vercel.json, with headroom for
// the surrounding request.
const TIME_BUDGET_SECONDS = 240;

function isAuthorized(req: VercelRequest): boolean {
    if (process.env.NODE_ENV !== 'production') return true;
    const authHeader = req.headers['authorization'];
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // No librarySlug: every library that has a photographer set.
        const result = await retrogradeRename({
            dryRun: false,
            timeBudgetSeconds: TIME_BUDGET_SECONDS,
        });

        if (result.authError) {
            // Worth shouting about: unattended runs fail silently otherwise, and
            // this is the error that already cost a day.
            console.error(`[cron/retrograde] halted — ${result.authError}`);
            return res.status(200).json({ ok: false, ...result });
        }

        const done = result.remaining === 0;
        console.log(
            `[cron/retrograde] renamed=${result.renamed} failed=${result.failed} remaining=${result.remaining}` +
            (result.skippedUnattributed.length ? ` skippedUnattributed=${result.skippedUnattributed.join(',')}` : '') +
            (done ? ' — nothing left to do' : ''),
        );

        return res.status(200).json({ ok: true, done, ...result });
    } catch (err: any) {
        console.error('[cron/retrograde] failed:', err?.message);
        return res.status(500).json({ error: err?.message || 'Retrograde rename failed' });
    }
}
