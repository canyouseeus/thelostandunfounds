/**
 * SEO — admin panel.
 *
 * Our own site audit: a daily crawl of www.thelostandunfounds.com that checks
 * what Ahrefs Site Audit checks (status codes, broken links, redirects,
 * sitemaps, titles and descriptions, h1, canonicals, noindex, structured data,
 * internal links and orphans, alt text, page speed and size). Issues are
 * grouped by type and severity, each with the URLs behind it and what changed
 * since the run before. Below that, Search Console numbers when connected.
 *
 * Data: /api/admin/seo-audit (lib/api-handlers/admin/seo-audit.ts).
 * The crawl itself: lib/seo-audit/. Daily run: /api/cron/seo-audit.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowPathIcon, ChevronDownIcon, ChevronRightIcon, PlayIcon } from '@heroicons/react/24/outline';
import { logApiCall, logError } from '../../lib/adminErrorLog';
import { CHART_ACCENTS, Sparkline } from '../ui/viz';

const square = { borderRadius: 0 } as const;

type Severity = 'error' | 'warning' | 'notice';

interface RunSummary {
    id: string;
    status: 'running' | 'done' | 'failed';
    trigger: string;
    startedAt: string;
    finishedAt: string | null;
    pagesCrawled: number;
    queued: number;
    phase: string;
    errors: number;
    warnings: number;
    notices: number;
    healthScore: number | null;
    stats: { indexable?: number; avgLoadMs?: number; sitemapUrls?: number; externalChecked?: number; hitPageLimit?: boolean; sitemapFiles?: Array<{ url: string; status: number; urls: number }> } | null;
    error: string | null;
}

interface IssueGroup {
    code: string;
    severity: Severity;
    title: string;
    about: string;
    count: number;
    before: number | null;
    fixed: string[];
    items: Array<{ url: string; detail: string | null; isNew: boolean }>;
}

interface Report {
    current: RunSummary | null;
    previous: RunSummary | null;
    running: RunSummary | null;
    groups: IssueGroup[];
    history: Array<{ id: string; startedAt: string; errors: number; warnings: number; notices: number; healthScore: number | null; pagesCrawled: number }>;
    failed: RunSummary[];
    gscConfigured: boolean;
}

interface GscRow { key: string; clicks: number; impressions: number; ctr: number; position: number }
interface GscData {
    configured: boolean;
    site?: string;
    range?: { start: string; end: string; days: number };
    totals?: { clicks: number; impressions: number; ctr: number; position: number };
    daily?: GscRow[];
    queries?: GscRow[];
    pages?: GscRow[];
    sitemaps?: Array<{ path: string; lastDownloaded: string | null; errors: number; warnings: number; submitted: number; isPending: boolean }>;
    error?: string;
}

const SEV_LABEL: Record<Severity, string> = { error: 'Errors', warning: 'Warnings', notice: 'Notices' };
const SEV_TEXT: Record<Severity, string> = { error: 'text-red-400', warning: 'text-amber-400', notice: 'text-white/50' };

const central = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : '';

const pathOf = (u: string) => { try { const x = new URL(u); return x.pathname + x.search; } catch { return u; } };

async function api<T = any>(query = '', init: RequestInit = {}): Promise<T> {
    const method = init.method || 'GET';
    const res = await fetch(`/api/admin/seo-audit${query}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    logApiCall(method, '/api/admin/seo-audit', res.status, res.ok ? 'ok' : body?.error || 'failed');
    if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
    return body as T;
}

function Delta({ now, before, invert = true }: { now: number; before: number | null | undefined; invert?: boolean }) {
    if (before === null || before === undefined) return null;
    const d = now - before;
    if (d === 0) return <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">no change</span>;
    const good = invert ? d < 0 : d > 0;
    return <span className={`text-[10px] font-bold tracking-widest ${good ? 'text-green-400' : 'text-red-400'}`}>{d > 0 ? `+${d}` : d}</span>;
}

function Stat({ label, value, extra, className = '' }: { label: string; value: React.ReactNode; extra?: React.ReactNode; className?: string }) {
    return (
        <div className="bg-white/5 p-4 text-left" style={square}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{label}</p>
            <p className={`text-2xl font-black mt-1 ${className}`}>{value}</p>
            {extra ? <div className="mt-1">{extra}</div> : null}
        </div>
    );
}

export default function AdminSeoView() {
    const [report, setReport] = useState<Report | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [filter, setFilter] = useState<Severity | 'all'>('all');
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [gsc, setGsc] = useState<GscData | null>(null);
    const stopRef = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api<Report>();
            setReport(r);
            setError(null);
            if (r.gscConfigured) {
                api<GscData>('?gsc=1').then(setGsc).catch((e) => setGsc({ configured: true, error: e.message }));
            } else {
                setGsc({ configured: false });
            }
        } catch (e: any) {
            setError(e.message);
            logError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); return () => { stopRef.current = true; }; }, [load]);

    // Each call works for about 45 s; keep calling while the run is going.
    const runNow = async () => {
        setRunning(true);
        stopRef.current = false;
        try {
            for (let i = 0; i < 40 && !stopRef.current; i++) {
                const r = await api<{ status: string; phase: string; pagesCrawled: number; queued: number }>('', { method: 'POST', body: JSON.stringify({ action: 'run' }) });
                if (r.status === 'done' || r.status === 'failed') break;
                setProgress(r.status === 'busy'
                    ? 'Another run is working right now. Checking again…'
                    : r.phase === 'external'
                        ? `Checking outgoing links (${r.pagesCrawled} pages crawled, ${r.queued} links left)`
                        : `Crawling: ${r.pagesCrawled} pages done, ${r.queued} queued`);
                if (r.status === 'busy') await new Promise((ok) => setTimeout(ok, 15_000));
            }
        } catch (e: any) {
            setError(e.message);
            logError(e.message);
        } finally {
            setRunning(false);
            setProgress(null);
            load();
        }
    };

    const cur = report?.current;
    const prev = report?.previous;
    const groups = (report?.groups ?? []).filter((g) => filter === 'all' || g.severity === filter);
    const visible = groups.filter((g) => g.count > 0);
    const fixedOnly = groups.filter((g) => g.count === 0 && g.fixed.length > 0);
    const health = (report?.history ?? []).map((h) => h.healthScore ?? 0);

    return (
        <div className="space-y-6 text-left pt-2">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    data-tour="seo-run"
                    onClick={runNow}
                    disabled={running}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    style={square}
                >
                    {running ? <ArrowPathIcon className="w-3 h-3 shrink-0 animate-spin" /> : <PlayIcon className="w-3 h-3 shrink-0" />}
                    <span className="whitespace-nowrap">{running ? 'Running' : report?.running ? 'Continue Run' : 'Run Audit Now'}</span>
                </button>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                    style={square}
                >
                    <ArrowPathIcon className={`w-3 h-3 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                    <span className="whitespace-nowrap">Refresh</span>
                </button>
                <p className="text-xs text-white/50">
                    {progress
                        ?? (report?.running ? `A run is in progress: ${report.running.pagesCrawled} pages so far.` : null)
                        ?? (cur ? `Last audit ${central(cur.finishedAt)}. Runs daily around 2 AM Central.` : 'Runs daily around 2 AM Central.')}
                </p>
            </div>

            {error && <p className="text-sm text-red-400 bg-white/5 p-3" style={square}>{error}</p>}

            {!loading && report && !cur && !report.running && (
                <p className="text-sm text-white/60 bg-white/5 p-4" style={square}>No audit has finished yet. Tap RUN AUDIT NOW to crawl the site.</p>
            )}

            {cur && (
                <>
                    <div data-tour="seo-summary" className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                        <Stat label="Health" value={`${cur.healthScore ?? 0}%`} extra={<><p className="text-[10px] text-white/40">Share of crawled URLs with no errors</p><Delta now={cur.healthScore ?? 0} before={prev?.healthScore} invert={false} /></>} />
                        <Stat label="URLs Crawled" value={cur.pagesCrawled} extra={<p className="text-[10px] text-white/40">{cur.stats?.indexable ?? 0} indexable</p>} />
                        <Stat label="Errors" value={cur.errors} className={SEV_TEXT.error} extra={<Delta now={cur.errors} before={prev?.errors} />} />
                        <Stat label="Warnings" value={cur.warnings} className={SEV_TEXT.warning} extra={<Delta now={cur.warnings} before={prev?.warnings} />} />
                        <Stat label="Notices" value={cur.notices} extra={<Delta now={cur.notices} before={prev?.notices} />} />
                    </div>

                    {health.length >= 2 && (
                        <div data-tour="seo-history" className="bg-white/5 p-4" style={square}>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">Health, last {health.length} runs</p>
                            <Sparkline values={health} className={`h-16 w-full ${CHART_ACCENTS.analytics}`} />
                        </div>
                    )}

                    <div data-tour="seo-filters" className="flex flex-wrap gap-2">
                        {(['all', 'error', 'warning', 'notice'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white hover:text-black'}`}
                                style={square}
                            >
                                <span className="whitespace-nowrap">{f === 'all' ? 'All' : SEV_LABEL[f]}</span>
                            </button>
                        ))}
                    </div>

                    <div data-tour="seo-issues" className="space-y-1">
                        {visible.length === 0 && <p className="text-sm text-white/50 p-4 bg-white/5" style={square}>Nothing here.</p>}
                        {visible.map((g, idx) => {
                            const isOpen = open[g.code];
                            const newCount = g.items.filter((i) => i.isNew).length;
                            return (
                                <div key={g.code} className="bg-white/5" style={square}>
                                    <button
                                        data-tour={idx === 0 ? 'seo-issue' : undefined}
                                        onClick={() => setOpen((o) => ({ ...o, [g.code]: !o[g.code] }))}
                                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/10 transition-colors"
                                        style={square}
                                    >
                                        {isOpen ? <ChevronDownIcon className="w-4 h-4 shrink-0 text-white/40" /> : <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40" />}
                                        <span className={`text-[10px] font-black uppercase tracking-widest w-16 shrink-0 ${SEV_TEXT[g.severity]}`}>{g.severity}</span>
                                        <span className="flex-1 text-sm font-bold">{g.title}</span>
                                        {newCount > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-red-400 whitespace-nowrap">{newCount} new</span>}
                                        {g.fixed.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-green-400 whitespace-nowrap">{g.fixed.length} fixed</span>}
                                        <span className="text-sm font-black tabular-nums">{g.count}</span>
                                    </button>
                                    {isOpen && (
                                        <div className="px-3 pb-3 space-y-2">
                                            <p className="text-xs text-white/50">{g.about}</p>
                                            <ul className="space-y-1">
                                                {g.items.slice(0, 200).map((i) => (
                                                    <li key={i.url + (i.detail || '')} className="text-xs bg-black/40 p-2" style={square}>
                                                        <a href={i.url} target="_blank" rel="noopener noreferrer" className="font-mono text-white hover:underline break-all">{pathOf(i.url)}</a>
                                                        {i.isNew && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-red-400">new</span>}
                                                        {i.detail && <p className="text-white/50 mt-0.5 break-words">{i.detail}</p>}
                                                    </li>
                                                ))}
                                                {g.items.length > 200 && <li className="text-xs text-white/40">and {g.items.length - 200} more</li>}
                                            </ul>
                                            {g.fixed.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mt-2">Fixed since last run</p>
                                                    <ul className="mt-1 space-y-0.5">{g.fixed.slice(0, 50).map((u) => <li key={u} className="text-xs font-mono text-white/50 break-all">{pathOf(u)}</li>)}</ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {fixedOnly.length > 0 && (
                            <div className="bg-white/5 p-3" style={square}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Cleared since last run</p>
                                <ul className="mt-1 space-y-0.5">{fixedOnly.map((g) => <li key={g.code} className="text-xs text-white/60">{g.title}: {g.fixed.length} URL{g.fixed.length === 1 ? '' : 's'}</li>)}</ul>
                            </div>
                        )}
                    </div>

                    {cur.stats?.sitemapFiles?.length ? (
                        <p className="text-xs text-white/40">
                            Sitemaps read: {cur.stats.sitemapFiles.map((f) => `${pathOf(f.url)} (${f.status === 200 ? `${f.urls} URLs` : `HTTP ${f.status}`})`).join(', ')}. {cur.stats.externalChecked ?? 0} outgoing links checked. Average HTML load {cur.stats.avgLoadMs ?? 0} ms from the crawler.
                        </p>
                    ) : null}
                </>
            )}

            {report?.failed?.length && report.failed[0] && (!cur || new Date(report.failed[0].startedAt) > new Date(cur.startedAt)) ? (
                <p className="text-xs text-red-400">The run started {central(report.failed[0].startedAt)} failed: {report.failed[0].error}</p>
            ) : null}

            <SearchConsole data={gsc} />

            <p className="text-xs text-white/30">Backlinks, Domain Rating and keyword search volumes come from Ahrefs' own index of the web, so this tool does not show them.</p>
        </div>
    );
}

function SearchConsole({ data }: { data: GscData | null }) {
    const [url, setUrl] = useState('');
    const [inspection, setInspection] = useState<Record<string, string | null> | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!data) return null;

    const inspect = async () => {
        setBusy(true);
        setErr(null);
        try {
            const r = await api<{ inspection: Record<string, string | null> }>(`?gsc=1&inspect=${encodeURIComponent(url.trim())}`);
            setInspection(r.inspection);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-tour="seo-gsc" className="bg-white/5 p-4 space-y-4" style={square}>
            <h3 className="text-sm font-black uppercase tracking-widest">Google Search Console</h3>
            {!data.configured && (
                <p className="text-xs text-white/50">Not connected yet. It needs a read-only Search Console sign-in saved as GSC_REFRESH_TOKEN in Vercel. Once that is set, clicks, impressions, top searches, top pages and Google's index status show here.</p>
            )}
            {data.error && <p className="text-xs text-red-400">{data.error}</p>}
            {data.totals && data.range && (
                <>
                    <p className="text-xs text-white/40">{data.site}, {data.range.start} to {data.range.end}</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <Stat label="Clicks" value={data.totals.clicks.toLocaleString()} />
                        <Stat label="Impressions" value={data.totals.impressions.toLocaleString()} />
                        <Stat label="CTR" value={`${(data.totals.ctr * 100).toFixed(1)}%`} />
                        <Stat label="Avg Position" value={data.totals.position ? data.totals.position.toFixed(1) : '0'} />
                    </div>
                    {(data.daily?.length ?? 0) >= 2 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">Clicks per day</p>
                            <Sparkline values={data.daily!.map((d) => d.clicks)} className={`h-16 w-full ${CHART_ACCENTS.analytics}`} />
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <GscTable title="Top Searches" rows={data.queries ?? []} />
                        <GscTable title="Top Pages" rows={(data.pages ?? []).map((r) => ({ ...r, key: pathOf(r.key) }))} />
                    </div>
                    {data.sitemaps?.length ? (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">Sitemaps Google has</p>
                            <ul className="space-y-0.5">
                                {data.sitemaps.map((s) => (
                                    <li key={s.path} className="text-xs text-white/60">
                                        {pathOf(s.path)}: {s.submitted} URLs submitted, read {central(s.lastDownloaded)}{s.errors ? `, ${s.errors} errors` : ''}{s.warnings ? `, ${s.warnings} warnings` : ''}{s.isPending ? ', pending' : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </>
            )}
            {data.configured && (
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Is it indexed?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.thelostandunfounds.com/…"
                            className="bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                            style={square}
                        />
                        <button
                            onClick={inspect}
                            disabled={busy || !url.trim()}
                            className="flex items-center justify-start gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                            style={square}
                        >
                            <span className="whitespace-nowrap">{busy ? 'Asking Google' : 'Check'}</span>
                        </button>
                    </div>
                    {err && <p className="text-xs text-red-400">{err}</p>}
                    {inspection && (
                        <ul className="text-xs text-white/60 space-y-0.5">
                            <li>Verdict: {inspection.verdict ?? 'unknown'}</li>
                            <li>Coverage: {inspection.coverageState ?? 'unknown'}</li>
                            <li>Last crawled: {inspection.lastCrawlTime ? central(inspection.lastCrawlTime) : 'never'}</li>
                            <li>Google's canonical: {inspection.googleCanonical ?? 'none'}</li>
                            <li>Your canonical: {inspection.userCanonical ?? 'none'}</li>
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function GscTable({ title, rows }: { title: string; rows: GscRow[] }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">{title}</p>
            {rows.length === 0 ? <p className="text-xs text-white/40">No data for this period.</p> : (
                <table className="w-full text-xs text-left">
                    <thead>
                        <tr className="text-white/40">
                            <th className="font-bold py-1 pr-2">{title === 'Top Pages' ? 'Page' : 'Search'}</th>
                            <th className="font-bold py-1 pr-2 text-right">Clicks</th>
                            <th className="font-bold py-1 pr-2 text-right">Impr.</th>
                            <th className="font-bold py-1 text-right">Pos.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 15).map((r) => (
                            <tr key={r.key} className="odd:bg-white/5">
                                <td className="py-1 pr-2 break-all">{r.key}</td>
                                <td className="py-1 pr-2 text-right tabular-nums">{r.clicks}</td>
                                <td className="py-1 pr-2 text-right tabular-nums">{r.impressions}</td>
                                <td className="py-1 text-right tabular-nums">{r.position.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
