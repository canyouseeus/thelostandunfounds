/**
 * Runs an audit in pieces and keeps the results in Supabase.
 *
 * Tables (supabase/migrations/20261110020000_seo_audit.sql):
 *   seo_audit_runs    one row per audit, with the resumable crawl state
 *   seo_audit_pages   one row per URL crawled in a run
 *   seo_audit_issues  one row per issue found in a run
 *
 * `advanceAudit` does as much as fits before a deadline and saves the state,
 * so a run can span several function invocations (the daily cron fires a few
 * times in a row, and the admin tab keeps calling while it shows progress).
 * A lease on the run row stops two invocations from crawling it at once.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { analyze, summarize, type Issue } from './analyze.js';
import { crawlStep, DEFAULT_CONFIG, startCrawl, type CrawlConfig, type CrawlState, type PageRecord } from './crawler.js';

/** Runs whose pages and issues are kept. Older runs keep only their summary row. */
export const KEEP_DETAILED_RUNS = 30;
const LEASE_MS = 6 * 60 * 1000;
/** A run still unfinished after this long is marked failed. */
const STALE_RUN_MS = 6 * 60 * 60 * 1000;

export interface RunRow {
    id: string;
    status: 'running' | 'done' | 'failed';
    trigger: string;
    start_url: string;
    started_at: string;
    finished_at: string | null;
    pages_crawled: number;
    errors: number;
    warnings: number;
    notices: number;
    health_score: number | null;
    stats: Record<string, unknown> | null;
    counts_by_code: Record<string, number> | null;
    error: string | null;
    state: CrawlState | null;
    lease_until: string | null;
    invocations: number;
}

export async function latestRun(db: SupabaseClient, status?: RunRow['status']): Promise<RunRow | null> {
    let q = db.from('seo_audit_runs').select('*').order('started_at', { ascending: false }).limit(1);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(`seo_audit_runs read failed: ${error.message}`);
    return (data?.[0] as RunRow) ?? null;
}

export async function createRun(db: SupabaseClient, trigger: string, cfg: CrawlConfig = DEFAULT_CONFIG): Promise<RunRow> {
    const { data, error } = await db
        .from('seo_audit_runs')
        .insert({ status: 'running', trigger, start_url: cfg.startUrl, state: null })
        .select('*')
        .single();
    if (error) throw new Error(`could not start a run: ${error.message}`);
    return data as RunRow;
}

/** Take the lease on a run. Returns null when another invocation holds it. */
async function claim(db: SupabaseClient, run: RunRow): Promise<RunRow | null> {
    const now = new Date();
    const { data, error } = await db
        .from('seo_audit_runs')
        .update({ lease_until: new Date(now.getTime() + LEASE_MS).toISOString(), invocations: (run.invocations ?? 0) + 1 })
        .eq('id', run.id)
        .eq('status', 'running')
        .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
        .select('*');
    if (error) throw new Error(`lease failed: ${error.message}`);
    return (data?.[0] as RunRow) ?? null;
}

async function savePages(db: SupabaseClient, runId: string, pages: PageRecord[]) {
    if (!pages.length) return;
    const rows = pages.map((p) => ({ run_id: runId, url: p.url, status: p.status, data: p }));
    const { error } = await db.from('seo_audit_pages').upsert(rows, { onConflict: 'run_id,url' });
    if (error) throw new Error(`saving pages failed: ${error.message}`);
}

export async function loadPages(db: SupabaseClient, runId: string): Promise<PageRecord[]> {
    const out: PageRecord[] = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('seo_audit_pages').select('data').eq('run_id', runId).order('url').range(from, from + 999);
        if (error) throw new Error(`loading pages failed: ${error.message}`);
        out.push(...(data ?? []).map((r: any) => r.data as PageRecord));
        if (!data || data.length < 1000) return out;
    }
}

export async function loadIssues(db: SupabaseClient, runId: string): Promise<Issue[]> {
    const out: Issue[] = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('seo_audit_issues').select('code, severity, url, detail').eq('run_id', runId).order('code').order('url').range(from, from + 999);
        if (error) throw new Error(`loading issues failed: ${error.message}`);
        out.push(...((data ?? []) as Issue[]));
        if (!data || data.length < 1000) return out;
    }
}

async function finish(db: SupabaseClient, run: RunRow, state: CrawlState) {
    const pages = await loadPages(db, run.id);
    const { issues, stats } = analyze(pages, state);
    const { bySeverity, byCode } = summarize(issues);

    for (let i = 0; i < issues.length; i += 500) {
        const rows = issues.slice(i, i + 500).map((x) => ({ run_id: run.id, ...x }));
        const { error } = await db.from('seo_audit_issues').insert(rows);
        if (error) throw new Error(`saving issues failed: ${error.message}`);
    }

    const { error } = await db.from('seo_audit_runs').update({
        status: 'done',
        finished_at: new Date().toISOString(),
        pages_crawled: pages.length,
        errors: bySeverity.error,
        warnings: bySeverity.warning,
        notices: bySeverity.notice,
        health_score: stats.healthScore,
        counts_by_code: byCode,
        stats: {
            ...stats,
            sitemapFiles: state.sitemapFiles,
            robotsStatus: state.robotsStatus,
            externalChecked: Object.keys(state.external).length,
            hitPageLimit: state.hitPageLimit,
        },
        // The crawl state is only needed to resume; the pages table has the rest.
        state: null,
        lease_until: null,
    }).eq('id', run.id);
    if (error) throw new Error(`closing the run failed: ${error.message}`);

    await prune(db);
}

/** Keep detail for the newest KEEP_DETAILED_RUNS finished runs. */
async function prune(db: SupabaseClient) {
    const { data } = await db
        .from('seo_audit_runs')
        .select('id')
        .eq('status', 'done')
        .order('started_at', { ascending: false })
        .range(KEEP_DETAILED_RUNS, KEEP_DETAILED_RUNS + 50);
    const old = (data ?? []).map((r: any) => r.id);
    if (!old.length) return;
    await db.from('seo_audit_pages').delete().in('run_id', old);
    await db.from('seo_audit_issues').delete().in('run_id', old);
}

export interface AdvanceResult {
    runId: string;
    status: RunRow['status'] | 'busy';
    phase: CrawlState['phase'] | 'starting';
    pagesCrawled: number;
    queued: number;
}

/**
 * Work on a running audit until `deadline` (epoch ms). Starts the crawl on
 * the first call. Never throws for a crawl problem: the run is marked failed
 * with the reason instead.
 */
export async function advanceAudit(db: SupabaseClient, run: RunRow, deadline: number, cfg: CrawlConfig = DEFAULT_CONFIG): Promise<AdvanceResult> {
    if (Date.now() - new Date(run.started_at).getTime() > STALE_RUN_MS) {
        await db.from('seo_audit_runs').update({ status: 'failed', error: 'Did not finish within 6 hours', lease_until: null, finished_at: new Date().toISOString() }).eq('id', run.id);
        return { runId: run.id, status: 'failed', phase: run.state?.phase ?? 'starting', pagesCrawled: run.state?.pagesCrawled ?? 0, queued: 0 };
    }
    const claimed = await claim(db, run);
    if (!claimed) {
        return { runId: run.id, status: 'busy', phase: run.state?.phase ?? 'starting', pagesCrawled: run.state?.pagesCrawled ?? 0, queued: run.state?.queue.length ?? 0 };
    }

    let state = claimed.state;
    try {
        if (!state) state = await startCrawl(cfg);
        // Leave time to write the state back.
        const workUntil = deadline - 5_000;
        state = await crawlStep(state, cfg, workUntil, (pages) => savePages(db, run.id, pages));
        if (state.phase === 'done') {
            await finish(db, claimed, state);
            return { runId: run.id, status: 'done', phase: 'done', pagesCrawled: state.pagesCrawled, queued: 0 };
        }
        const { error } = await db.from('seo_audit_runs')
            .update({ state, pages_crawled: state.pagesCrawled, lease_until: null })
            .eq('id', run.id);
        if (error) throw new Error(`saving progress failed: ${error.message}`);
        return { runId: run.id, status: 'running', phase: state.phase, pagesCrawled: state.pagesCrawled, queued: state.queue.length + state.externalQueue.length };
    } catch (err: any) {
        const message = String(err?.message || err).slice(0, 500);
        console.error('[seo-audit] run failed', run.id, message);
        await db.from('seo_audit_runs').update({ status: 'failed', error: message, lease_until: null, finished_at: new Date().toISOString(), state }).eq('id', run.id);
        return { runId: run.id, status: 'failed', phase: state?.phase ?? 'starting', pagesCrawled: state?.pagesCrawled ?? 0, queued: 0 };
    }
}
