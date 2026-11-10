/**
 * Run the site audit from a terminal, without the database.
 *
 *   npx tsx scripts/seo-audit.ts                       # crawl production
 *   npx tsx scripts/seo-audit.ts http://localhost:4173 # crawl a local preview
 *   npx tsx scripts/seo-audit.ts --json > audit.json   # full issue list as JSON
 *   npx tsx scripts/seo-audit.ts --strict              # exit 1 on any error-level issue
 *
 * Same crawler and checks as the daily cron (lib/seo-audit/), so what this
 * prints is what Admin → SEO will show.
 */

import { analyze, ISSUES, summarize } from '../lib/seo-audit/analyze.js';
import { crawlStep, DEFAULT_CONFIG, startCrawl, type CrawlConfig, type PageRecord } from '../lib/seo-audit/crawler.js';

const args = process.argv.slice(2);
const startArg = args.find((a) => /^https?:\/\//.test(a));
const json = args.includes('--json');
const strict = args.includes('--strict');

async function main() {
    const cfg: CrawlConfig = { ...DEFAULT_CONFIG };
    if (startArg) {
        const u = new URL(startArg);
        cfg.startUrl = `${u.origin}/`;
        cfg.internalHosts = [...new Set([u.hostname, ...DEFAULT_CONFIG.internalHosts])];
    }
    const log = (s: string) => { if (!json) console.error(s); };

    log(`Crawling ${cfg.startUrl} …`);
    let state = await startCrawl(cfg);
    log(`robots.txt ${state.robotsStatus}; sitemaps: ${state.sitemapFiles.map((f) => `${f.url} (${f.status}, ${f.urls} URLs)`).join(', ') || 'none'}`);

    const pages: PageRecord[] = [];
    state = await crawlStep(state, cfg, Number.POSITIVE_INFINITY, async (batch) => {
        pages.push(...batch);
        log(`  ${pages.length} crawled, ${state.queue.length} queued`);
    });

    const { issues, stats } = analyze(pages, state, cfg.internalHosts);
    const { bySeverity, byCode } = summarize(issues);

    if (json) {
        console.log(JSON.stringify({ stats, bySeverity, issues }, null, 2));
    } else {
        console.log(`\n${stats.pagesCrawled} URLs crawled, ${stats.indexable} indexable, health ${stats.healthScore}%, average HTML load ${stats.avgLoadMs} ms`);
        console.log(`${bySeverity.error} errors, ${bySeverity.warning} warnings, ${bySeverity.notice} notices\n`);
        const codes = Object.keys(byCode).sort((a, b) => {
            const o = { error: 0, warning: 1, notice: 2 };
            return o[ISSUES[a as keyof typeof ISSUES].severity] - o[ISSUES[b as keyof typeof ISSUES].severity] || byCode[b] - byCode[a];
        });
        for (const code of codes) {
            const def = ISSUES[code as keyof typeof ISSUES];
            console.log(`[${def.severity.toUpperCase()}] ${def.title}: ${byCode[code]}`);
            for (const i of issues.filter((x) => x.code === code).slice(0, 10)) {
                console.log(`    ${i.url}${i.detail ? `  —  ${i.detail}` : ''}`);
            }
            if (byCode[code] > 10) console.log(`    … and ${byCode[code] - 10} more`);
        }
    }
    if (strict && bySeverity.error > 0) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
