/**
 * IndexNow: tells Bing, Yandex and the other IndexNow engines that URLs changed.
 *
 * Ownership is proved by a key file hosted on the domain, not an account, so
 * this runs unattended. The key is public by design: IndexNow fetches it from
 * KEY_LOCATION (public/<key>.txt) and rejects submissions with 403 if it 404s.
 *
 * Used by scripts/indexnow-submit.ts (manual) and api/cron/indexnow.ts (daily).
 */

export const INDEXNOW_KEY = 'a73bf3c06aeeee5d886fc659409cd66e';
export const INDEXNOW_HOST = 'www.thelostandunfounds.com';
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** IndexNow accepts at most 10,000 URLs per request. */
const MAX_URLS = 10_000;

export interface SitemapEntry {
    loc: string;
    lastmod: Date | null;
}

/** Every <url> in the live sitemap, with its <lastmod> when it parses. */
export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
    const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`);
    if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
    const xml = await res.text();
    const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
        const block = m[1];
        const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() || '';
        const raw = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim();
        const date = raw ? new Date(raw) : null;
        return { loc, lastmod: date && !isNaN(date.getTime()) ? date : null };
    }).filter((e) => e.loc);
    if (entries.length === 0) throw new Error('sitemap.xml parsed to 0 URLs');
    return entries;
}

/** Throws unless the key file is live and holds the key. */
export async function verifyKeyFile(): Promise<void> {
    const res = await fetch(INDEXNOW_KEY_LOCATION);
    const body = res.ok ? (await res.text()).trim() : '';
    if (!res.ok || body !== INDEXNOW_KEY) {
        throw new Error(`IndexNow key file check failed at ${INDEXNOW_KEY_LOCATION}: status=${res.status}`);
    }
}

export interface SubmitResult {
    status: number;
    accepted: boolean;
    body: string;
}

/**
 * Submit on-site URLs. Refuses anything off this origin, since a submission
 * for another host is rejected wholesale.
 */
export async function submitToIndexNow(urls: string[]): Promise<SubmitResult> {
    const urlList = [...new Set(urls)];
    const offSite = urlList.filter((u) => !u.startsWith(`${INDEXNOW_ORIGIN}/`) && u !== INDEXNOW_ORIGIN);
    if (offSite.length > 0) {
        throw new Error(`Refusing to submit URLs outside ${INDEXNOW_ORIGIN}: ${offSite.join(', ')}`);
    }
    if (urlList.length === 0) throw new Error('No URLs to submit');
    if (urlList.length > MAX_URLS) throw new Error(`Too many URLs (${urlList.length} > ${MAX_URLS})`);

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
            host: INDEXNOW_HOST,
            key: INDEXNOW_KEY,
            keyLocation: INDEXNOW_KEY_LOCATION,
            urlList,
        }),
    });
    const body = (await res.text()).trim();
    // 200 = accepted, 202 = accepted while the key is still being validated.
    return { status: res.status, accepted: res.status === 200 || res.status === 202, body };
}
