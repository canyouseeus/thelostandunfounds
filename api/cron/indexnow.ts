import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    fetchSitemapEntries,
    submitToIndexNow,
    verifyKeyFile,
} from '../../lib/indexnow.js';

/**
 * Daily IndexNow ping for pages that changed.
 *
 * Ahrefs (Nov 2026) reported "Changed pages not submitted to IndexNow" on every
 * sitemap URL: the submitter existed (npm run indexnow) but nothing ran it.
 * This cron reads the live sitemap and submits only the URLs whose <lastmod>
 * falls inside the last WINDOW_HOURS, so a quiet day sends nothing and an
 * unchanged URL is not re-submitted day after day. Static pages take the build
 * time as their lastmod, so they go out once after each production deploy.
 *
 * GET ?dryRun=1 (still behind CRON_SECRET) lists what would be sent.
 */

// A little over a day, so a cron that fires a few minutes late misses nothing.
const WINDOW_HOURS = 25;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const since = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
        const entries = await fetchSitemapEntries();
        const changed = entries
            .filter((e) => e.lastmod && e.lastmod.getTime() >= since)
            .map((e) => e.loc);

        if (changed.length === 0) {
            return res.status(200).json({ submitted: 0, message: `No sitemap URLs changed in the last ${WINDOW_HOURS}h` });
        }

        if (req.query.dryRun === '1') {
            return res.status(200).json({ dryRun: true, wouldSubmit: changed.length, urls: changed });
        }

        await verifyKeyFile();
        const result = await submitToIndexNow(changed);
        if (!result.accepted) {
            console.error('[indexnow] rejected', result.status, result.body);
            return res.status(502).json({ submitted: 0, status: result.status, body: result.body });
        }

        console.log(`[indexnow] submitted ${changed.length} URL(s), HTTP ${result.status}`);
        return res.status(200).json({ submitted: changed.length, status: result.status });
    } catch (err: any) {
        console.error('[indexnow] failed', err);
        return res.status(500).json({ error: err?.message || 'IndexNow submission failed' });
    }
}
