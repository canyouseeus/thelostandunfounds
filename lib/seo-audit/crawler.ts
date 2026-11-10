/**
 * The crawler: fetches the site page by page, the way Ahrefs Site Audit does,
 * and records what each URL returned.
 *
 * It starts at the homepage and every URL in the sitemaps robots.txt names,
 * follows internal <a href> links, and follows redirects by hand so every hop
 * of a chain is recorded. robots.txt Disallow rules are respected.
 *
 * Built to run in pieces. A Vercel function has a time limit, so `crawlStep`
 * works until a deadline and returns a plain-JSON `CrawlState` that the next
 * invocation picks up (see store.ts). Nothing here touches the database.
 */

import { parseHtml, parseRobots, parseSitemap } from './parse.js';
import { checkJsonLd, type SchemaProblem } from './schema.js';

export const SITE_ORIGIN = 'https://www.thelostandunfounds.com';
/** Hosts whose links count as internal. The apex redirects to www. */
export const INTERNAL_HOSTS = ['www.thelostandunfounds.com', 'thelostandunfounds.com'];
export const USER_AGENT = 'TLUSiteAudit/1.0 (+https://www.thelostandunfounds.com)';

export interface CrawlConfig {
    startUrl: string;
    maxPages: number;
    concurrency: number;
    timeoutMs: number;
    maxRedirects: number;
    /** Cap on distinct external URLs checked per run. */
    maxExternal: number;
    fetchImpl: typeof fetch;
    internalHosts: string[];
}

export const DEFAULT_CONFIG: CrawlConfig = {
    startUrl: `${SITE_ORIGIN}/`,
    maxPages: 1500,
    concurrency: 6,
    timeoutMs: 15_000,
    maxRedirects: 10,
    maxExternal: 200,
    fetchImpl: (...args) => fetch(...args),
    internalHosts: INTERNAL_HOSTS,
};

export interface Hop {
    url: string;
    status: number;
}

export interface PageRecord {
    url: string;
    depth: number | null;
    status: number;
    finalUrl: string;
    /** Redirect hops before the final response (empty when none). */
    redirects: Hop[];
    redirectLoop: boolean;
    error: string | null;
    contentType: string | null;
    xRobotsTag: string | null;
    /** Time until the final response's headers, in ms. */
    ttfbMs: number;
    /** Time until the final response's body was read, in ms. */
    loadMs: number;
    bytes: number;
    isHtml: boolean;
    /** 200 response that is the site's "Not Found" shell (vercel.json rewrites unknown paths to /404.html). */
    softNotFound: boolean;
    titles: string[];
    metaDescriptions: string[];
    h1: string[];
    canonicals: string[];
    metaRobots: string | null;
    lang: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    wordCount: number;
    schemaTypes: string[];
    schemaProblems: SchemaProblem[];
    jsonLdBlocks: number;
    imagesTotal: number;
    imagesMissingAlt: string[];
    /** Internal link targets (normalized, unique) with whether any link to it was nofollow. */
    internalLinks: Array<{ url: string; nofollow: boolean }>;
    externalLinks: string[];
    /** Internal URLs linked from here that robots.txt blocks. */
    blockedLinks: string[];
}

export interface QueueItem {
    url: string;
    depth: number | null;
}

export interface CrawlState {
    phase: 'crawl' | 'external' | 'done';
    queue: QueueItem[];
    seen: string[];
    /** page URL -> sitemap URLs that list it */
    sitemaps: Record<string, string[]>;
    sitemapFiles: Array<{ url: string; status: number; urls: number; error?: string }>;
    disallow: string[];
    robotsStatus: number | null;
    pagesCrawled: number;
    /** External URLs still to check, and results so far. */
    externalQueue: string[];
    external: Record<string, { status: number; error?: string }>;
    hitPageLimit: boolean;
}

/* ── URLs ─────────────────────────────────────────────────────────────── */

export function normalizeUrl(href: string, base: string): string | null {
    const h = href.trim();
    if (!h || /^(mailto|tel|javascript|data|sms|blob|about):/i.test(h) || h.startsWith('#')) return null;
    let u: URL;
    try { u = new URL(h, base); } catch { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
}

export const isInternal = (url: string, hosts = INTERNAL_HOSTS) => {
    try { return hosts.includes(new URL(url).hostname); } catch { return false; }
};

/** robots.txt prefix match with * and $ support. */
export function isDisallowed(url: string, disallow: string[]): boolean {
    let path: string;
    try { const u = new URL(url); path = u.pathname + u.search; } catch { return false; }
    return disallow.some((rule) => {
        const re = new RegExp('^' + rule.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$'));
        return re.test(path);
    });
}

/* ── Fetching ─────────────────────────────────────────────────────────── */

async function fetchOnce(cfg: CrawlConfig, url: string, method = 'GET') {
    return cfg.fetchImpl(url, {
        method,
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(cfg.timeoutMs),
    });
}

const MAX_BODY = 5 * 1024 * 1024;

async function readBody(res: Response): Promise<string> {
    const buf = await res.arrayBuffer();
    return new TextDecoder('utf-8').decode(buf.byteLength > MAX_BODY ? buf.slice(0, MAX_BODY) : buf);
}

export async function fetchText(cfg: CrawlConfig, url: string): Promise<{ status: number; text: string; error?: string }> {
    try {
        const res = await cfg.fetchImpl(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(cfg.timeoutMs) });
        return { status: res.status, text: res.ok ? await readBody(res) : '' };
    } catch (err: any) {
        return { status: 0, text: '', error: String(err?.message || err) };
    }
}

/** Fetch one internal URL, following redirects by hand, and build its record. */
export async function crawlPage(cfg: CrawlConfig, item: QueueItem): Promise<PageRecord> {
    const redirects: Hop[] = [];
    let current = item.url;
    let redirectLoop = false;
    const visited = new Set<string>([current]);

    const base: PageRecord = {
        url: item.url, depth: item.depth, status: 0, finalUrl: item.url, redirects, redirectLoop: false, error: null,
        contentType: null, xRobotsTag: null, ttfbMs: 0, loadMs: 0, bytes: 0, isHtml: false, softNotFound: false,
        titles: [], metaDescriptions: [], h1: [], canonicals: [], metaRobots: null, lang: null,
        ogTitle: null, ogDescription: null, ogImage: null, wordCount: 0, schemaTypes: [], schemaProblems: [],
        jsonLdBlocks: 0, imagesTotal: 0, imagesMissingAlt: [], internalLinks: [], externalLinks: [], blockedLinks: [],
    };

    for (let hop = 0; hop <= cfg.maxRedirects; hop++) {
        const started = Date.now();
        let res: Response;
        try {
            res = await fetchOnce(cfg, current);
        } catch (err: any) {
            const msg = err?.name === 'TimeoutError' ? `Timed out after ${cfg.timeoutMs} ms` : String(err?.message || err);
            return { ...base, finalUrl: current, error: msg, ttfbMs: Date.now() - started, loadMs: Date.now() - started };
        }
        const ttfb = Date.now() - started;
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
            redirects.push({ url: current, status: res.status });
            try { await res.body?.cancel(); } catch { /* ignore */ }
            const next = normalizeUrl(location, current);
            if (!next) return { ...base, status: res.status, finalUrl: current, error: `Bad redirect target: ${location}` };
            if (visited.has(next)) { redirectLoop = true; return { ...base, status: res.status, finalUrl: next, redirectLoop, error: 'Redirect loop' }; }
            visited.add(next);
            current = next;
            continue;
        }

        const contentType = res.headers.get('content-type');
        const isHtml = /text\/html|application\/xhtml/i.test(contentType || '');
        const rec: PageRecord = {
            ...base, status: res.status, finalUrl: current, contentType, isHtml, ttfbMs: ttfb,
            xRobotsTag: res.headers.get('x-robots-tag')?.toLowerCase() ?? null,
        };
        // Only parse HTML that lives on our own site.
        if (!isHtml || !isInternal(current, cfg.internalHosts)) {
            try { await res.body?.cancel(); } catch { /* ignore */ }
            rec.loadMs = Date.now() - started;
            rec.bytes = Number(res.headers.get('content-length') || 0);
            return rec;
        }
        const html = await readBody(res);
        rec.loadMs = Date.now() - started;
        rec.bytes = new TextEncoder().encode(html).byteLength;
        return { ...rec, ...extract(cfg, html, current) };
    }
    return { ...base, status: redirects.at(-1)?.status ?? 0, finalUrl: current, error: `More than ${cfg.maxRedirects} redirects` };
}

const NOT_FOUND_TITLE = /^not found \|/i;

function extract(cfg: CrawlConfig, html: string, pageUrl: string): Partial<PageRecord> {
    const p = parseHtml(html);
    const schema = checkJsonLd(p.jsonLd);
    const internal = new Map<string, boolean>();
    const external = new Set<string>();
    for (const link of p.links) {
        const url = normalizeUrl(link.href, pageUrl);
        if (!url || url === pageUrl) continue;
        const nofollow = /\bnofollow\b/.test(link.rel);
        if (isInternal(url, cfg.internalHosts)) internal.set(url, (internal.get(url) ?? true) && nofollow);
        else external.add(url);
    }
    const missingAlt = p.images.filter((i) => i.alt === null || i.alt.trim() === '').map((i) => i.src).filter(Boolean);
    return {
        titles: p.titles,
        metaDescriptions: p.metaDescriptions,
        h1: p.h1,
        canonicals: p.canonicals.map((c) => normalizeUrl(c, pageUrl) ?? c),
        metaRobots: p.metaRobots,
        lang: p.lang,
        ogTitle: p.ogTitle,
        ogDescription: p.ogDescription,
        ogImage: p.ogImage,
        wordCount: p.wordCount,
        schemaTypes: schema.types,
        schemaProblems: schema.problems,
        jsonLdBlocks: p.jsonLd.length,
        imagesTotal: p.images.length,
        imagesMissingAlt: [...new Set(missingAlt)].slice(0, 20),
        internalLinks: [...internal].map(([url, nofollow]) => ({ url, nofollow })),
        externalLinks: [...external],
        softNotFound: p.titles.some((t) => NOT_FOUND_TITLE.test(t)) && /noindex/.test(p.metaRobots || ''),
    };
}

/* ── Start, step, finish ──────────────────────────────────────────────── */

/** Read robots.txt and the sitemaps, and seed the queue. */
export async function startCrawl(cfg: CrawlConfig): Promise<CrawlState> {
    const origin = new URL(cfg.startUrl).origin;
    const robots = await fetchText(cfg, `${origin}/robots.txt`);
    const { sitemaps: listed, disallow } = parseRobots(robots.text);
    const sitemapUrls = listed.length ? listed : [`${origin}/sitemap.xml`];

    const state: CrawlState = {
        phase: 'crawl', queue: [], seen: [], sitemaps: {}, sitemapFiles: [], disallow,
        robotsStatus: robots.status, pagesCrawled: 0, externalQueue: [], external: {}, hitPageLimit: false,
    };

    const pending = [...new Set(sitemapUrls)];
    const done = new Set<string>();
    while (pending.length && done.size < 50) {
        const sm = pending.shift()!;
        if (done.has(sm)) continue;
        done.add(sm);
        const res = await fetchText(cfg, sm);
        const parsed = res.text ? parseSitemap(res.text) : { isIndex: false, locs: [] };
        state.sitemapFiles.push({ url: sm, status: res.status, urls: parsed.isIndex ? 0 : parsed.locs.length, ...(res.error ? { error: res.error } : {}) });
        if (parsed.isIndex) { pending.push(...parsed.locs); continue; }
        for (const loc of parsed.locs) {
            const url = normalizeUrl(loc, sm);
            if (!url) continue;
            (state.sitemaps[url] ??= []).includes(sm) || state.sitemaps[url].push(sm);
        }
    }

    const start = normalizeUrl(cfg.startUrl, cfg.startUrl)!;
    enqueue(state, cfg, { url: start, depth: 0 });
    for (const url of Object.keys(state.sitemaps)) enqueue(state, cfg, { url, depth: null });
    return state;
}

function enqueue(state: CrawlState, cfg: CrawlConfig, item: QueueItem): void {
    if (!isInternal(item.url, cfg.internalHosts) || isDisallowed(item.url, state.disallow)) return;
    if (state.seen.includes(item.url)) {
        // A sitemap seed found later by a link gets its real depth.
        const q = state.queue.find((x) => x.url === item.url);
        if (q && q.depth === null && item.depth !== null) q.depth = item.depth;
        return;
    }
    if (state.seen.length >= cfg.maxPages) { state.hitPageLimit = true; return; }
    state.seen.push(item.url);
    state.queue.push(item);
}

/**
 * Crawl until the queue is empty or `deadline` (epoch ms) passes. Calls
 * `onPages` with each finished batch so the caller can store them.
 * Pages already in flight when the deadline passes still finish.
 */
export async function crawlStep(
    state: CrawlState,
    cfg: CrawlConfig,
    deadline: number,
    onPages: (pages: PageRecord[]) => Promise<void>,
): Promise<CrawlState> {
    while (state.phase === 'crawl') {
        if (Date.now() >= deadline) return state;
        // Pages found by links first (depth known), then sitemap-only seeds.
        state.queue.sort((a, b) => (a.depth ?? 1e9) - (b.depth ?? 1e9));
        const batch = state.queue.splice(0, cfg.concurrency);
        if (batch.length === 0) {
            state.phase = 'external';
            break;
        }
        const pages = await Promise.all(batch.map((item) => crawlPage(cfg, item)));
        for (const page of pages) {
            state.pagesCrawled++;
            for (const link of page.internalLinks) {
                if (isDisallowed(link.url, state.disallow)) page.blockedLinks.push(link.url);
                else enqueue(state, cfg, { url: link.url, depth: page.depth === null ? null : page.depth + 1 });
            }
            for (const ext of page.externalLinks) {
                if (!(ext in state.external) && !state.externalQueue.includes(ext) && state.externalQueue.length + Object.keys(state.external).length < cfg.maxExternal) {
                    state.externalQueue.push(ext);
                }
            }
        }
        await onPages(pages);
    }

    // External links: a HEAD (GET when HEAD is refused) on each distinct URL.
    while (state.phase === 'external') {
        if (Date.now() >= deadline) return state;
        const batch = state.externalQueue.splice(0, cfg.concurrency);
        if (batch.length === 0) { state.phase = 'done'; break; }
        const results = await Promise.all(batch.map((url) => checkExternal(cfg, url)));
        batch.forEach((url, i) => { state.external[url] = results[i]; });
    }
    return state;
}

export async function checkExternal(cfg: CrawlConfig, url: string): Promise<{ status: number; error?: string }> {
    const attempt = async (method: string) => {
        const res = await cfg.fetchImpl(url, {
            method,
            redirect: 'follow',
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(Math.min(cfg.timeoutMs, 10_000)),
        });
        try { await res.body?.cancel(); } catch { /* ignore */ }
        return res.status;
    };
    try {
        let status = await attempt('HEAD');
        if (status === 405 || status === 501 || status === 403) status = await attempt('GET');
        return { status };
    } catch (err: any) {
        return { status: 0, error: err?.name === 'TimeoutError' ? 'Timed out' : String(err?.message || err).slice(0, 120) };
    }
}
