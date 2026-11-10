/**
 * Turns a finished crawl into a list of issues.
 *
 * Each issue type is one entry in ISSUES, named after the Ahrefs Site Audit
 * check it stands in for where there is one. Severity is this tool's own:
 * error = hurts indexing or is plainly broken, warning = worth fixing,
 * notice = for information.
 *
 * Content checks (title, description, h1, alt text, structured data) only run
 * on indexable pages: a 200 HTML page on our host that is not noindex.
 */

import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX } from '../../scripts/lib/seo-meta.js';
import { isInternal, type CrawlState, type PageRecord } from './crawler.js';
import { pageTypeOf } from './schema.js';

export type Severity = 'error' | 'warning' | 'notice';

export interface IssueType {
    severity: Severity;
    title: string;
    /** One line: what it is and why it matters. */
    about: string;
}

export const SLOW_PAGE_MS = 1500;
export const HEAVY_PAGE_BYTES = 1024 * 1024;
export const LOW_WORD_COUNT = 100;
export const LONG_CHAIN_HOPS = 2;

export const ISSUES = {
    http_4xx: { severity: 'error', title: '4XX page', about: 'An internal URL returns a client error, so it cannot be indexed.' },
    soft_404: { severity: 'error', title: 'Soft 404', about: 'Returns 200 but serves the site\'s Not Found page. Search engines treat it as a broken page.' },
    http_5xx: { severity: 'error', title: '5XX page', about: 'An internal URL returns a server error.' },
    fetch_failed: { severity: 'error', title: 'Page failed to load', about: 'The request timed out or the connection failed.' },
    broken_internal_link: { severity: 'error', title: 'Page has links to broken page', about: 'Links on this page point to an internal URL that returns 4XX, 5XX or a soft 404.' },
    redirect_loop: { severity: 'error', title: 'Redirect loop', about: 'The redirects lead back to a URL already in the chain.' },
    broken_redirect: { severity: 'error', title: 'Redirect to broken page', about: 'The redirect chain ends on a 4XX or 5XX.' },
    redirect_chain: { severity: 'warning', title: 'Redirect chain', about: `${LONG_CHAIN_HOPS} or more redirects before the final page. Each hop slows crawling.` },
    links_to_redirect: { severity: 'notice', title: 'Page has links to redirect', about: 'Internal links point at a URL that redirects. Link to the final URL instead.' },
    http_to_https: { severity: 'notice', title: 'HTTP to HTTPS redirect', about: 'An http:// URL that redirects to https://. Links and sitemaps should use https.' },
    sitemap_4xx: { severity: 'error', title: '4XX page in sitemap', about: 'A sitemap lists a URL that is broken.' },
    sitemap_3xx: { severity: 'error', title: '3XX redirect in sitemap', about: 'A sitemap lists a URL that redirects. List the final URL.' },
    sitemap_noindex: { severity: 'error', title: 'Noindex page in sitemap', about: 'A sitemap asks search engines to index a page that says noindex.' },
    sitemap_non_canonical: { severity: 'error', title: 'Non-canonical page in sitemap', about: 'A sitemap lists a page whose canonical points somewhere else.' },
    sitemap_multiple: { severity: 'notice', title: 'Page in multiple sitemaps', about: 'The same URL is listed in more than one sitemap.' },
    sitemap_unreadable: { severity: 'error', title: 'Sitemap could not be read', about: 'A sitemap named in robots.txt did not return 200.' },
    orphan: { severity: 'error', title: 'Orphan page', about: 'In a sitemap, but no crawled page links to it.' },
    single_inbound_link: { severity: 'notice', title: 'Page has only one incoming internal link', about: 'Only one followed internal link points here.' },
    nofollow_inbound_only: { severity: 'warning', title: 'Page has nofollow incoming internal links only', about: 'Every internal link to this page is nofollow.' },
    title_missing: { severity: 'error', title: 'Title tag missing or empty', about: 'The page has no <title>.' },
    title_multiple: { severity: 'warning', title: 'Multiple title tags', about: 'More than one <title> in the head.' },
    title_too_long: { severity: 'warning', title: 'Title too long', about: `Longer than ${TITLE_MAX} characters, so search results cut it off.` },
    title_duplicate: { severity: 'warning', title: 'Duplicate title', about: 'Another indexable page has the same title.' },
    meta_missing: { severity: 'warning', title: 'Meta description tag missing or empty', about: 'Search engines write their own snippet instead.' },
    meta_multiple: { severity: 'warning', title: 'Multiple meta description tags', about: 'More than one meta description in the head.' },
    meta_too_long: { severity: 'warning', title: 'Meta description too long', about: `Longer than ${DESCRIPTION_MAX} characters.` },
    meta_too_short: { severity: 'warning', title: 'Meta description too short', about: `Shorter than ${DESCRIPTION_MIN} characters.` },
    meta_duplicate: { severity: 'warning', title: 'Duplicate meta description', about: 'Another indexable page has the same description.' },
    duplicate_no_canonical: { severity: 'error', title: 'Duplicate pages without canonical', about: 'Pages with the same title and description, none of which points a canonical at another.' },
    h1_missing: { severity: 'warning', title: 'H1 tag missing or empty', about: 'The page has no visible h1 in its pre-rendered HTML.' },
    h1_multiple: { severity: 'notice', title: 'Multiple H1 tags', about: 'More than one h1 on the page.' },
    canonical_missing: { severity: 'warning', title: 'Canonical URL missing', about: 'No <link rel="canonical">.' },
    canonical_multiple: { severity: 'warning', title: 'Multiple canonical tags', about: 'More than one canonical, so search engines may ignore them all.' },
    canonical_to_4xx: { severity: 'error', title: 'Canonical points to 4XX', about: 'The canonical URL is broken.' },
    canonical_to_redirect: { severity: 'warning', title: 'Canonical points to redirect', about: 'The canonical URL redirects. Point it at the final URL.' },
    canonical_to_noindex: { severity: 'error', title: 'Canonical points to noindex page', about: 'The canonical URL says noindex.' },
    canonical_other: { severity: 'notice', title: 'Non-canonical page', about: 'The canonical points to a different URL, so this one should not be indexed.' },
    noindex: { severity: 'notice', title: 'Noindex page', about: 'The page asks not to be indexed (meta robots or X-Robots-Tag).' },
    nofollow_page: { severity: 'notice', title: 'Nofollow page', about: 'The page asks crawlers not to follow its links.' },
    schema_invalid: { severity: 'error', title: 'Structured data has validation errors', about: 'JSON-LD is invalid JSON, has no schema.org context, misses a required property or uses one the type does not take.' },
    schema_expected_missing: { severity: 'warning', title: 'Expected structured data missing', about: 'This kind of page should carry a particular schema type and does not.' },
    schema_none: { severity: 'notice', title: 'No structured data', about: 'The page has no JSON-LD at all.' },
    img_alt_missing: { severity: 'warning', title: 'Missing alt text', about: 'Images with no alt attribute, or an empty one.' },
    og_missing: { severity: 'notice', title: 'Open Graph tags incomplete', about: 'og:title, og:description or og:image is missing, so shared links look bare.' },
    slow_page: { severity: 'warning', title: 'Slow page', about: `Took more than ${SLOW_PAGE_MS} ms to load the HTML, measured from the crawler.` },
    heavy_page: { severity: 'warning', title: 'HTML page too large', about: 'The HTML alone is over 1 MB.' },
    low_word_count: { severity: 'notice', title: 'Low word count', about: `Fewer than ${LOW_WORD_COUNT} words in the pre-rendered HTML.` },
    broken_external_link: { severity: 'warning', title: 'Page has broken external links', about: 'An outgoing link returns 404 or 410.' },
    external_unreachable: { severity: 'notice', title: 'External link did not respond', about: 'An outgoing link timed out or returned 5XX. It may be temporary.' },
    blocked_by_robots: { severity: 'notice', title: 'Links to pages blocked by robots.txt', about: 'Internal links point to URLs robots.txt disallows, so the crawler skipped them.' },
    page_limit: { severity: 'warning', title: 'Crawl stopped at page limit', about: 'The crawl hit its page cap before visiting every URL.' },
} satisfies Record<string, IssueType>;

export type IssueCode = keyof typeof ISSUES;

export interface Issue {
    code: IssueCode;
    severity: Severity;
    url: string;
    detail: string | null;
}

const isRedirect = (p: PageRecord) => p.redirects.length > 0;
const finalBroken = (p: PageRecord) => p.status >= 400 || p.status === 0 || p.softNotFound || p.redirectLoop;
const robotsOf = (p: PageRecord) => `${p.metaRobots || ''},${p.xRobotsTag || ''}`;
export const isNoindex = (p: PageRecord) => /\b(noindex|none)\b/.test(robotsOf(p));
const isNofollow = (p: PageRecord) => /\b(nofollow|none)\b/.test(robotsOf(p));
const pathOf = (u: string) => { try { return new URL(u).pathname; } catch { return u; } };
const short = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const list = (xs: string[], n = 5) => xs.slice(0, n).join(', ') + (xs.length > n ? ` and ${xs.length - n} more` : '');

export interface AnalysisResult {
    issues: Issue[];
    stats: {
        pagesCrawled: number;
        indexable: number;
        /** Internal URLs (excluding redirects) with no error-level issue, as a share of internal URLs crawled. */
        healthScore: number;
        avgLoadMs: number;
        sitemapUrls: number;
    };
}

export function analyze(pages: PageRecord[], state: CrawlState, hosts?: string[]): AnalysisResult {
    const issues: Issue[] = [];
    const add = (code: IssueCode, url: string, detail: string | null = null) =>
        issues.push({ code, severity: ISSUES[code].severity, url, detail });

    const byUrl = new Map(pages.map((p) => [p.url, p]));
    const internal = pages.filter((p) => isInternal(p.url, hosts));
    const indexable = internal.filter((p) => !isRedirect(p) && p.status === 200 && p.isHtml && !p.softNotFound && !isNoindex(p) && isInternal(p.finalUrl, hosts));

    // Inbound links: followed and nofollow, by target, from pages that loaded.
    const inbound = new Map<string, { follow: Set<string>; nofollow: Set<string> }>();
    for (const p of internal) {
        for (const l of p.internalLinks) {
            const entry = inbound.get(l.url) ?? { follow: new Set(), nofollow: new Set() };
            (l.nofollow ? entry.nofollow : entry.follow).add(p.url);
            inbound.set(l.url, entry);
        }
    }
    // A link to a URL that redirects counts toward the page it lands on.
    for (const p of internal) {
        if (!isRedirect(p) || p.finalUrl === p.url) continue;
        const from = inbound.get(p.url);
        if (!from) continue;
        const to = inbound.get(p.finalUrl) ?? { follow: new Set(), nofollow: new Set() };
        from.follow.forEach((u) => to.follow.add(u));
        from.nofollow.forEach((u) => to.nofollow.add(u));
        inbound.set(p.finalUrl, to);
    }

    /* Status codes, redirects, broken links */
    for (const p of internal) {
        if (p.error && !p.redirectLoop && p.status === 0) add('fetch_failed', p.url, p.error);
        if (p.redirectLoop) add('redirect_loop', p.url, p.redirects.map((h) => h.url).join(' → '));
        if (isRedirect(p) && !p.redirectLoop) {
            if (p.status >= 400) add('broken_redirect', p.url, `${p.redirects.length} hop(s) to ${p.finalUrl} (${p.status})`);
            if (p.redirects.length >= LONG_CHAIN_HOPS) add('redirect_chain', p.url, [...p.redirects.map((h) => `${h.url} (${h.status})`), p.finalUrl].join(' → '));
            const firstTarget = p.redirects[1]?.url ?? p.finalUrl;
            if (p.url.startsWith('http://') && firstTarget.startsWith('https://')) add('http_to_https', p.url, `→ ${firstTarget}`);
        }
        if (!isRedirect(p)) {
            if (p.status >= 500) add('http_5xx', p.url, `HTTP ${p.status}`);
            else if (p.status >= 400) add('http_4xx', p.url, `HTTP ${p.status}`);
            else if (p.softNotFound) add('soft_404', p.url, 'Served the Not Found page with HTTP 200');
        }
    }

    for (const p of internal) {
        const broken: string[] = [];
        const redirecting: string[] = [];
        for (const l of p.internalLinks) {
            const t = byUrl.get(l.url);
            if (!t) continue;
            if (finalBroken(t)) broken.push(`${pathOf(l.url)} (${t.softNotFound ? 'soft 404' : t.status || 'failed'})`);
            else if (isRedirect(t)) redirecting.push(`${pathOf(l.url)} → ${pathOf(t.finalUrl)}`);
        }
        if (broken.length) add('broken_internal_link', p.url, list(broken));
        if (redirecting.length) add('links_to_redirect', p.url, list(redirecting));
        if (p.blockedLinks.length) add('blocked_by_robots', p.url, list(p.blockedLinks.map(pathOf)));

        const badExt: string[] = [];
        const downExt: string[] = [];
        for (const e of p.externalLinks) {
            const r = state.external[e];
            if (!r) continue;
            if (r.status === 404 || r.status === 410) badExt.push(`${short(e, 80)} (${r.status})`);
            else if (r.status === 0 || r.status >= 500) downExt.push(`${short(e, 80)} (${r.status || r.error || 'failed'})`);
            // 401/403/429/999: the site refuses bots; that says nothing about the link.
        }
        if (badExt.length) add('broken_external_link', p.url, list(badExt, 3));
        if (downExt.length) add('external_unreachable', p.url, list(downExt, 3));
    }

    /* Sitemaps */
    for (const f of state.sitemapFiles) {
        if (f.status !== 200) add('sitemap_unreadable', f.url, f.error || `HTTP ${f.status}`);
    }
    const canonicalOf = (p: PageRecord) => (p.canonicals.length === 1 ? p.canonicals[0] : null);
    for (const [url, maps] of Object.entries(state.sitemaps)) {
        if (maps.length > 1) add('sitemap_multiple', url, list(maps.map(pathOf)));
        const p = byUrl.get(url);
        if (!p) continue;
        if (isRedirect(p)) add('sitemap_3xx', url, `Redirects to ${p.finalUrl}`);
        else if (finalBroken(p)) add('sitemap_4xx', url, p.softNotFound ? 'Soft 404' : `HTTP ${p.status || 'failed'}`);
        else if (isNoindex(p)) add('sitemap_noindex', url, `robots: ${robotsOf(p).replace(/^,|,$/g, '')}`);
        else {
            const c = canonicalOf(p);
            if (c && c !== p.url) add('sitemap_non_canonical', url, `Canonical is ${c}`);
        }
        const inb = inbound.get(url);
        if (!isRedirect(p) && !finalBroken(p) && (!inb || inb.follow.size + inb.nofollow.size === 0) && pathOf(url) !== '/') {
            add('orphan', url, `Listed in ${list(maps.map(pathOf))}`);
        }
    }

    /* Inbound link counts */
    for (const p of indexable) {
        if (pathOf(p.url) === '/') continue;
        const inb = inbound.get(p.url);
        if (!inb) continue;
        if (inb.follow.size === 0 && inb.nofollow.size > 0) add('nofollow_inbound_only', p.url, `${inb.nofollow.size} nofollow link(s)`);
        else if (inb.follow.size === 1) add('single_inbound_link', p.url, `From ${[...inb.follow][0]}`);
    }

    /* On-page content, indexable pages only */
    const titles = new Map<string, string[]>();
    const descs = new Map<string, string[]>();
    for (const p of indexable) {
        const title = p.titles[0]?.trim() ?? '';
        const desc = p.metaDescriptions[0]?.trim() ?? '';
        if (!title) add('title_missing', p.url);
        else {
            if (title.length > TITLE_MAX) add('title_too_long', p.url, `${title.length} chars: ${short(title)}`);
            (titles.get(title) ?? titles.set(title, []).get(title)!).push(p.url);
        }
        if (p.titles.length > 1) add('title_multiple', p.url, `${p.titles.length} title tags`);
        if (!desc) add('meta_missing', p.url);
        else {
            if (desc.length > DESCRIPTION_MAX) add('meta_too_long', p.url, `${desc.length} chars`);
            else if (desc.length < DESCRIPTION_MIN) add('meta_too_short', p.url, `${desc.length} chars: ${short(desc)}`);
            (descs.get(desc) ?? descs.set(desc, []).get(desc)!).push(p.url);
        }
        if (p.metaDescriptions.length > 1) add('meta_multiple', p.url, `${p.metaDescriptions.length} description tags`);

        const h1 = p.h1.filter(Boolean);
        if (h1.length === 0) add('h1_missing', p.url);
        else if (h1.length > 1) add('h1_multiple', p.url, list(h1.map((h) => short(h, 50)), 3));

        if (p.canonicals.length === 0) add('canonical_missing', p.url);
        else if (p.canonicals.length > 1) add('canonical_multiple', p.url, list(p.canonicals));
        else {
            const c = p.canonicals[0];
            const target = byUrl.get(c);
            if (c !== p.url) {
                add('canonical_other', p.url, `Canonical is ${c}`);
                if (target) {
                    if (isRedirect(target)) add('canonical_to_redirect', p.url, `${c} → ${target.finalUrl}`);
                    else if (finalBroken(target)) add('canonical_to_4xx', p.url, `${c} (${target.softNotFound ? 'soft 404' : target.status})`);
                    else if (isNoindex(target)) add('canonical_to_noindex', p.url, c);
                }
            }
        }

        if (p.schemaProblems.some((s) => s.severity === 'error')) {
            add('schema_invalid', p.url, list(p.schemaProblems.filter((s) => s.severity === 'error').map((s) => s.message), 4));
        }
        const rule = pageTypeOf(pathOf(p.url));
        if (rule && !rule.expectAny.some((t) => p.schemaTypes.includes(t))) {
            add('schema_expected_missing', p.url, `${rule.pageType} page: expected ${rule.expectAny.join(' or ')}; found ${p.schemaTypes.join(', ') || 'none'}`);
        } else if (!rule && p.jsonLdBlocks === 0) {
            add('schema_none', p.url);
        }

        if (p.imagesMissingAlt.length) add('img_alt_missing', p.url, `${p.imagesMissingAlt.length} of ${p.imagesTotal}: ${list(p.imagesMissingAlt.map((s) => short(s, 60)), 3)}`);
        const ogMissing = [!p.ogTitle && 'og:title', !p.ogDescription && 'og:description', !p.ogImage && 'og:image'].filter(Boolean) as string[];
        if (ogMissing.length) add('og_missing', p.url, `Missing ${ogMissing.join(', ')}`);
        if (p.wordCount < LOW_WORD_COUNT) add('low_word_count', p.url, `${p.wordCount} words`);
        if (isNofollow(p)) add('nofollow_page', p.url);
    }

    for (const p of internal) {
        if (p.status !== 200 || !p.isHtml) continue;
        if (p.loadMs > SLOW_PAGE_MS) add('slow_page', p.url, `${p.loadMs} ms (first byte ${p.ttfbMs} ms)`);
        if (p.bytes > HEAVY_PAGE_BYTES) add('heavy_page', p.url, `${(p.bytes / 1024 / 1024).toFixed(2)} MB`);
        if (isNoindex(p) && !p.softNotFound) add('noindex', p.url, robotsOf(p).replace(/^,|,$/g, ''));
    }

    for (const [title, urls] of titles) if (urls.length > 1) urls.forEach((u) => add('title_duplicate', u, `Same as ${list(urls.filter((x) => x !== u).map(pathOf), 3)}: ${short(title, 80)}`));
    for (const [, urls] of descs) if (urls.length > 1) urls.forEach((u) => add('meta_duplicate', u, `Same as ${list(urls.filter((x) => x !== u).map(pathOf), 3)}`));

    // Same title and same description, and no page in the group canonicalizes to another.
    const groups = new Map<string, PageRecord[]>();
    for (const p of indexable) {
        const t = p.titles[0]?.trim();
        const d = p.metaDescriptions[0]?.trim();
        if (!t || !d) continue;
        const key = `${t}\u0000${d}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
    }
    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const urls = group.map((p) => p.url);
        const handled = group.some((p) => p.canonicals.length === 1 && p.canonicals[0] !== p.url && urls.includes(p.canonicals[0]));
        if (!handled) group.forEach((p) => add('duplicate_no_canonical', p.url, `Same as ${list(urls.filter((u) => u !== p.url).map(pathOf), 3)}`));
    }

    if (state.hitPageLimit) add('page_limit', new URL(pages[0]?.url || 'https://www.thelostandunfounds.com/').origin + '/', `Stopped at ${state.seen.length} URLs`);

    const counted = internal.filter((p) => !isRedirect(p));
    const withErrors = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.url));
    const healthy = counted.filter((p) => !withErrors.has(p.url)).length;
    const loaded = internal.filter((p) => p.status === 200 && p.isHtml);

    return {
        issues,
        stats: {
            pagesCrawled: pages.length,
            indexable: indexable.length,
            healthScore: counted.length ? Math.round((100 * healthy) / counted.length) : 0,
            avgLoadMs: loaded.length ? Math.round(loaded.reduce((s, p) => s + p.loadMs, 0) / loaded.length) : 0,
            sitemapUrls: Object.keys(state.sitemaps).length,
        },
    };
}

/** Issue counts by severity and by code. */
export function summarize(issues: Issue[]) {
    const bySeverity: Record<Severity, number> = { error: 0, warning: 0, notice: 0 };
    const byCode: Record<string, number> = {};
    for (const i of issues) {
        bySeverity[i.severity]++;
        byCode[i.code] = (byCode[i.code] ?? 0) + 1;
    }
    return { bySeverity, byCode };
}

export interface IssueDiff {
    code: IssueCode;
    now: number;
    before: number;
    added: string[];
    fixed: string[];
}

/** Per issue type: URLs that are new since the previous run, and URLs that no longer have it. */
export function diffIssues(current: Array<Pick<Issue, 'code' | 'url'>>, previous: Array<Pick<Issue, 'code' | 'url'>> | null): IssueDiff[] {
    const group = (xs: Array<Pick<Issue, 'code' | 'url'>>) => {
        const m = new Map<string, Set<string>>();
        for (const x of xs) (m.get(x.code) ?? m.set(x.code, new Set()).get(x.code)!).add(x.url);
        return m;
    };
    const now = group(current);
    const before = previous ? group(previous) : new Map<string, Set<string>>();
    const codes = new Set([...now.keys(), ...before.keys()]);
    return [...codes].filter((c) => c in ISSUES).map((code) => {
        const n = now.get(code) ?? new Set<string>();
        const b = before.get(code) ?? new Set<string>();
        return {
            code: code as IssueCode,
            now: n.size,
            before: b.size,
            added: previous ? [...n].filter((u) => !b.has(u)) : [],
            fixed: [...b].filter((u) => !n.has(u)),
        };
    });
}
