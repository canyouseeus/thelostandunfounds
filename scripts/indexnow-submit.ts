/**
 * IndexNow submitter.
 *
 * Google has no public "please crawl this" API; that lives behind Search
 * Console and a human login. IndexNow is the equivalent for Bing and Yandex,
 * and it authenticates with a key file hosted on the domain rather than an
 * account, so this runs unattended. Worth having beyond Bing's own traffic:
 * Microsoft Copilot's search is Bing-backed, so a URL pushed here can reach
 * LLM answers within hours instead of waiting on an organic crawl.
 *
 * Usage:
 *   npm run indexnow                 # submit every URL in the live sitemap
 *   npm run indexnow -- <url> [...]  # submit specific URLs
 *
 * The key file must be live at https://<host>/<key>.txt before submitting;
 * IndexNow fetches it to prove ownership and returns 403 if it 404s. Deploy
 * before running this, not after.
 */

const KEY = 'a73bf3c06aeeee5d886fc659409cd66e';
const HOST = 'www.thelostandunfounds.com';
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function urlsFromSitemap(): Promise<string[]> {
    const res = await fetch(`${ORIGIN}/sitemap.xml`);
    if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (locs.length === 0) throw new Error('sitemap.xml parsed to 0 URLs; refusing to submit');
    return locs;
}

async function main() {
    const args = process.argv.slice(2).filter((a) => a.startsWith('http'));

    // Ownership is proved by the key file, so a missing or stale one makes every
    // submission a silent no-op. Check it before sending anything.
    const keyRes = await fetch(KEY_LOCATION);
    const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
    if (!keyRes.ok || keyBody !== KEY) {
        console.error(`❌ Key file check failed at ${KEY_LOCATION}`);
        console.error(`   status=${keyRes.status} body="${keyBody.slice(0, 40)}" expected="${KEY}"`);
        console.error('   Deploy the key file first; IndexNow will reject the submission without it.');
        process.exit(1);
    }
    console.log(`✅ Key file verified at ${KEY_LOCATION}`);

    const urlList = args.length > 0 ? args : await urlsFromSitemap();
    const offSite = urlList.filter((u) => !u.startsWith(ORIGIN));
    if (offSite.length > 0) {
        console.error(`❌ Refusing to submit URLs outside ${ORIGIN}:\n   ${offSite.join('\n   ')}`);
        process.exit(1);
    }

    console.log(`🔎 Submitting ${urlList.length} URL(s) to IndexNow...`);
    urlList.forEach((u) => console.log(`   ${u}`));

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });

    const body = await res.text();
    // 200 = accepted, 202 = accepted but key still validating. Anything else failed.
    if (res.status === 200 || res.status === 202) {
        console.log(`✅ IndexNow accepted the submission (HTTP ${res.status}).`);
        if (body.trim()) console.log(`   ${body.trim()}`);
    } else {
        console.error(`❌ IndexNow rejected the submission (HTTP ${res.status}).`);
        console.error(`   ${body.trim() || '(empty body)'}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
