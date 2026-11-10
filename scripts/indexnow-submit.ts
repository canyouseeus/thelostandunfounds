/**
 * IndexNow submitter.
 *
 * Google has no public "please crawl this" API — that lives behind Search
 * Console and a human login. IndexNow is the equivalent for Bing and Yandex,
 * and it authenticates with a key file hosted on the domain rather than an
 * account, so this runs unattended. Worth having beyond Bing's own traffic:
 * Microsoft Copilot's search is Bing-backed, so a URL pushed here can reach
 * LLM answers within hours instead of waiting on an organic crawl.
 *
 * Changed pages are also submitted every day by api/cron/indexnow.ts; this
 * script is for a manual push.
 *
 * Usage:
 *   npm run indexnow                 # submit every URL in the live sitemap
 *   npm run indexnow -- <url> [...]  # submit specific URLs
 *
 * The key file must be live at https://<host>/<key>.txt before submitting —
 * IndexNow fetches it to prove ownership and returns 403 if it 404s. Deploy
 * before running this, not after.
 */

import {
    INDEXNOW_KEY_LOCATION,
    fetchSitemapEntries,
    submitToIndexNow,
    verifyKeyFile,
} from '../lib/indexnow';

async function main() {
    const args = process.argv.slice(2).filter((a) => a.startsWith('http'));

    // Ownership is proved by the key file, so a missing or stale one makes every
    // submission a silent no-op. Check it before sending anything.
    await verifyKeyFile();
    console.log(`✅ Key file verified at ${INDEXNOW_KEY_LOCATION}`);

    const urlList = args.length > 0 ? args : (await fetchSitemapEntries()).map((e) => e.loc);

    console.log(`🔎 Submitting ${urlList.length} URL(s) to IndexNow...`);
    urlList.forEach((u) => console.log(`   ${u}`));

    const result = await submitToIndexNow(urlList);
    if (result.accepted) {
        console.log(`✅ IndexNow accepted the submission (HTTP ${result.status}).`);
        if (result.body) console.log(`   ${result.body}`);
    } else {
        console.error(`❌ IndexNow rejected the submission (HTTP ${result.status}).`);
        console.error(`   ${result.body || '(empty body)'}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    process.exit(1);
});
