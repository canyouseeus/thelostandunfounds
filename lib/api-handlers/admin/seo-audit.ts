/**
 * /api/admin/seo-audit — data for Admin → SEO.
 *
 * GET                  latest finished run: issues by type and severity, the
 *                      URLs behind each, what changed since the run before,
 *                      run history, and any run in progress.
 * GET ?run=<id>        the same for an older run.
 * GET ?gsc=1           Search Console clicks, impressions, top queries and
 *                      pages, when GSC_REFRESH_TOKEN is set (see _gsc.ts).
 * GET ?gsc=1&inspect=<url>  Google's index status for one of our URLs.
 * POST {action:"run"}  start a run now, or keep working on the one in
 *                      progress, for about 45 s. The tab calls it again while
 *                      the run is still going.
 *
 * Admin only: api/admin/[...path].ts checks verifyAdmin before routing here.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_booking-payment-utils.js';
import { diffIssues, ISSUES, type Issue, type IssueCode } from '../../seo-audit/analyze.js';
import { advanceAudit, createRun, latestRun, loadIssues, type RunRow } from '../../seo-audit/store.js';
import { fetchSearchConsole, gscConfigured, inspectUrl } from './_gsc.js';

// The admin router runs under the 60 s default.
const BUDGET_MS = 45_000;

const summaryOf = (r: RunRow) => ({
    id: r.id,
    status: r.status,
    trigger: r.trigger,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    pagesCrawled: r.state?.pagesCrawled ?? r.pages_crawled,
    queued: r.state ? r.state.queue.length + r.state.externalQueue.length : 0,
    phase: r.state?.phase ?? (r.status === 'done' ? 'done' : 'starting'),
    errors: r.errors,
    warnings: r.warnings,
    notices: r.notices,
    healthScore: r.health_score,
    stats: r.stats,
    error: r.error,
});

async function report(db: ReturnType<typeof getSupabaseAdmin>, runId?: string) {
    const { data: runs, error } = await db
        .from('seo_audit_runs')
        .select('id, status, trigger, start_url, started_at, finished_at, pages_crawled, errors, warnings, notices, health_score, stats, counts_by_code, error, invocations, lease_until, state')
        .order('started_at', { ascending: false })
        .limit(60);
    if (error) throw new Error(error.message.includes('does not exist') ? 'The SEO audit tables are not set up yet. Apply the seo_audit migration.' : error.message);

    const all = (runs ?? []) as RunRow[];
    const running = all.find((r) => r.status === 'running') ?? null;
    const done = all.filter((r) => r.status === 'done');
    const current = runId ? all.find((r) => r.id === runId && r.status === 'done') ?? null : done[0] ?? null;
    const previous = current ? done[done.indexOf(current) + 1] ?? null : null;

    let groups: any[] = [];
    if (current) {
        const issues = await loadIssues(db, current.id);
        const prevIssues = previous ? await loadIssues(db, previous.id) : null;
        const diffs = new Map(diffIssues(issues, prevIssues).map((d) => [d.code, d]));
        const byCode = new Map<IssueCode, Issue[]>();
        for (const i of issues) (byCode.get(i.code) ?? byCode.set(i.code, []).get(i.code)!).push(i);
        const order = { error: 0, warning: 1, notice: 2 } as const;
        const codes = new Set<IssueCode>([...byCode.keys(), ...[...diffs.values()].filter((d) => d.fixed.length).map((d) => d.code)]);
        groups = [...codes].map((code) => {
            const def = ISSUES[code];
            const d = diffs.get(code);
            const added = new Set(d?.added ?? []);
            return {
                code,
                severity: def.severity,
                title: def.title,
                about: def.about,
                count: byCode.get(code)?.length ?? 0,
                before: previous ? d?.before ?? 0 : null,
                fixed: d?.fixed ?? [],
                items: (byCode.get(code) ?? []).map((i) => ({ url: i.url, detail: i.detail, isNew: added.has(i.url) })),
            };
        }).sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count || a.title.localeCompare(b.title));
    }

    return {
        current: current ? summaryOf(current) : null,
        previous: previous ? summaryOf(previous) : null,
        running: running ? summaryOf(running) : null,
        groups,
        history: done.slice(0, 30).reverse().map((r) => ({
            id: r.id, startedAt: r.started_at, errors: r.errors, warnings: r.warnings, notices: r.notices,
            healthScore: r.health_score, pagesCrawled: r.pages_crawled,
        })),
        failed: all.filter((r) => r.status === 'failed').slice(0, 5).map(summaryOf),
        gscConfigured: gscConfigured(),
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const db = getSupabaseAdmin();

        if (req.method === 'GET') {
            if (req.query.gsc === '1') {
                if (!gscConfigured()) return res.status(200).json({ configured: false });
                if (typeof req.query.inspect === 'string') {
                    const target = req.query.inspect;
                    if (!/^https:\/\/(www\.)?thelostandunfounds\.com(\/|$)/.test(target)) return res.status(400).json({ error: 'Only thelostandunfounds.com URLs can be inspected' });
                    return res.status(200).json({ configured: true, inspection: await inspectUrl(target) });
                }
                const days = Math.min(Math.max(Number(req.query.days) || 28, 7), 90);
                return res.status(200).json({ configured: true, ...(await fetchSearchConsole(days)) });
            }
            const runId = typeof req.query.run === 'string' ? req.query.run : undefined;
            return res.status(200).json(await report(db, runId));
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
            if (body.action !== 'run') return res.status(400).json({ error: 'Unknown action' });
            const deadline = Date.now() + BUDGET_MS;
            let run = await latestRun(db, 'running');
            if (!run) run = await createRun(db, 'manual');
            const result = await advanceAudit(db, run, deadline);
            return res.status(200).json(result);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[admin/seo-audit]', err);
        return res.status(500).json({ error: err?.message || 'SEO audit request failed' });
    }
}
