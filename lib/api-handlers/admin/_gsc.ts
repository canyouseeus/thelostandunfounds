/**
 * Google Search Console for Admin → SEO: clicks, impressions, top queries and
 * pages, submitted sitemaps, and Google's index status for one URL.
 *
 * Needs its own refresh token. The existing GOOGLE_REFRESH_TOKEN was issued
 * for Drive only (scripts/setup-google-oauth.ts asks for the drive scope), and
 * Search Console needs https://www.googleapis.com/auth/webmasters.readonly.
 * Run `npx tsx scripts/setup-google-oauth.ts --gsc` to get one; it is saved as
 * GSC_REFRESH_TOKEN so the Drive token is left alone. It uses the same OAuth
 * client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
 *
 * GSC_SITE_URL is optional: without it the first property on the account for
 * thelostandunfounds.com is used (domain property first).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/webmasters/v3';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const DOMAIN = 'thelostandunfounds.com';

export const gscConfigured = () =>
    Boolean(process.env.GSC_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

async function accessToken(): Promise<string> {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: process.env.GSC_REFRESH_TOKEN!,
        }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
        throw new Error(`Google token exchange failed: ${body.error || res.status}${body.error_description ? ` (${body.error_description})` : ''}`);
    }
    return body.access_token;
}

async function call(token: string, url: string, init: RequestInit = {}) {
    const res = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Search Console ${res.status}: ${body?.error?.message || 'request failed'}`);
    return body;
}

async function siteUrl(token: string): Promise<string> {
    if (process.env.GSC_SITE_URL) return process.env.GSC_SITE_URL;
    const { siteEntry = [] } = await call(token, `${API}/sites`);
    const ours = (siteEntry as Array<{ siteUrl: string; permissionLevel: string }>)
        .filter((s) => s.permissionLevel !== 'siteUnverifiedUser' && s.siteUrl.includes(DOMAIN))
        .sort((a, b) => Number(b.siteUrl.startsWith('sc-domain:')) - Number(a.siteUrl.startsWith('sc-domain:')));
    if (!ours.length) throw new Error(`The Google account behind GSC_REFRESH_TOKEN has no verified Search Console property for ${DOMAIN}.`);
    return ours[0].siteUrl;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function fetchSearchConsole(days: number) {
    const token = await accessToken();
    const site = await siteUrl(token);
    const enc = encodeURIComponent(site);
    // Search Console data runs about two days behind.
    const end = new Date(Date.now() - 2 * 86400_000);
    const start = new Date(end.getTime() - (days - 1) * 86400_000);
    const query = (dimensions: string[], rowLimit: number) =>
        call(token, `${API}/sites/${enc}/searchAnalytics/query`, {
            method: 'POST',
            body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), dimensions, rowLimit, dataState: 'final' }),
        });

    const [byDate, byQuery, byPage, sitemaps] = await Promise.all([
        query(['date'], days + 5),
        query(['query'], 25),
        query(['page'], 25),
        call(token, `${API}/sites/${enc}/sitemaps`).catch(() => ({ sitemap: [] })),
    ]);

    const row = (r: any) => ({ key: r.keys?.[0] ?? '', clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 });
    const dates = (byDate.rows ?? []).map(row);
    const totals = dates.reduce(
        (t: any, r: any) => ({ clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions, posSum: t.posSum + r.position * r.impressions }),
        { clicks: 0, impressions: 0, posSum: 0 },
    );

    return {
        site,
        range: { start: ymd(start), end: ymd(end), days },
        totals: {
            clicks: totals.clicks,
            impressions: totals.impressions,
            ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
            // Impression-weighted, which is how Search Console averages position.
            position: totals.impressions ? totals.posSum / totals.impressions : 0,
        },
        daily: dates,
        queries: (byQuery.rows ?? []).map(row),
        pages: (byPage.rows ?? []).map(row),
        sitemaps: (sitemaps.sitemap ?? []).map((s: any) => ({
            path: s.path, lastSubmitted: s.lastSubmitted ?? null, lastDownloaded: s.lastDownloaded ?? null,
            isPending: Boolean(s.isPending), errors: Number(s.errors ?? 0), warnings: Number(s.warnings ?? 0),
            submitted: (s.contents ?? []).reduce((n: number, c: any) => n + Number(c.submitted ?? 0), 0),
        })),
    };
}

/** Google's own index status for one URL (URL Inspection API, 2,000 a day). */
export async function inspectUrl(url: string) {
    const token = await accessToken();
    const site = await siteUrl(token);
    const body = await call(token, INSPECT_URL, { method: 'POST', body: JSON.stringify({ inspectionUrl: url, siteUrl: site }) });
    const r = body.inspectionResult?.indexStatusResult ?? {};
    return {
        url,
        verdict: r.verdict ?? null,
        coverageState: r.coverageState ?? null,
        indexingState: r.indexingState ?? null,
        robotsTxtState: r.robotsTxtState ?? null,
        pageFetchState: r.pageFetchState ?? null,
        lastCrawlTime: r.lastCrawlTime ?? null,
        googleCanonical: r.googleCanonical ?? null,
        userCanonical: r.userCanonical ?? null,
    };
}
