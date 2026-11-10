/**
 * Crawls a small fixture site with one of every problem planted in it, and
 * checks each one is reported, and that the clean pages are not.
 *
 *   npx tsx --test lib/seo-audit/seo-audit.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { analyze, diffIssues, type Issue } from './analyze.js';
import { crawlStep, DEFAULT_CONFIG, startCrawl, type CrawlConfig, type PageRecord } from './crawler.js';
import { parseHtml, parseRobots, parseSitemap } from './parse.js';
import { checkJsonLd } from './schema.js';

const DESC = 'A description that is long enough to pass the minimum length check of one hundred and ten characters for sure, yes.';
const org = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'THE LOST+UNFOUNDS', url: 'https://www.thelostandunfounds.com' });

function page(opts: { id?: string; title?: string | null; desc?: string | null; h1?: string | null; canonical?: string | null; body?: string; jsonld?: string[]; robots?: string; og?: boolean }) {
    const t = opts.title === undefined ? `${opts.id ?? 'A fine'} page | THE LOST+UNFOUNDS` : opts.title;
    const d = opts.desc === undefined ? `${opts.id ?? ''} ${DESC}`.trim() : opts.desc;
    const og = opts.og === false ? '' : '<meta property="og:title" content="x"><meta property="og:description" content="x"><meta property="og:image" content="x">';
    return `<!doctype html><html lang="en"><head>
${t !== null ? `<title>${t}</title>` : ''}
${d !== null ? `<meta name="description" content="${d}">` : ''}
${opts.canonical ? `<link rel="canonical" href="${opts.canonical}">` : ''}
${opts.robots ? `<meta name="robots" content="${opts.robots}">` : ''}
${og}
${(opts.jsonld ?? [org]).map((j) => `<script type="application/ld+json">${j}</script>`).join('\n')}
</head><body>${opts.h1 === null ? '' : `<h1>${opts.h1 ?? 'Heading'}</h1>`}
<p>${'word '.repeat(150)}</p>
${opts.body ?? ''}
</body></html>`;
}

function fixture(base: string): Record<string, { status?: number; headers?: Record<string, string>; body?: string }> {
    const c = (p: string) => `${base}${p}`;
    return {
        '/robots.txt': { body: `User-agent: *\nDisallow: /private\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/sitemap-2.xml\n` },
        '/sitemap.xml': { headers: { 'content-type': 'application/xml' }, body: `<urlset><url><loc>${c('/')}</loc></url><url><loc>${c('/about')}</loc></url><url><loc>${c('/orphan')}</loc></url><url><loc>${c('/old')}</loc></url><url><loc>${c('/hidden')}</loc></url><url><loc>${c('/dupe-a')}</loc></url></urlset>` },
        '/sitemap-2.xml': { headers: { 'content-type': 'application/xml' }, body: `<urlset><url><loc>${c('/about')}</loc></url></urlset>` },
        '/': {
            body: page({
                id: 'home',
                canonical: c('/'),
                body: `<a href="/about">About</a> <a href="/missing">gone</a> <a href="/old">old</a> <a href="/nope">soft</a>
                <a href="/private/x">private</a> <a href="/long-title">t</a> <a href="/bad-schema">s</a> <a href="/hidden">h</a>
                <a href="/dupe-a">a</a> <a href="/dupe-b">b</a> <a href="/thelostarchives/a-post">post</a>
                <a href="http://localhost:${new URL(base).port}/ext-404">ext</a> <a href="mailto:a@b.c">mail</a>
                <img src="/a.jpg"><img src="/b.jpg" alt="ok">`,
            }),
        },
        '/about': { body: page({ id: '/about', canonical: c('/about') }) },
        '/orphan': { body: page({ title: 'Orphan | THE LOST+UNFOUNDS', canonical: c('/orphan') }) },
        '/old': { status: 301, headers: { location: '/older' } },
        '/older': { status: 302, headers: { location: '/about' } },
        '/missing': { status: 404, body: 'nope' },
        '/nope': { body: page({ title: 'Not Found | THE LOST+UNFOUNDS', robots: 'noindex, nofollow' }) },
        '/long-title': { body: page({ title: 'This title is far too long for a search result and will certainly be cut off | THE LOST+UNFOUNDS', desc: 'Too short.', h1: null, canonical: c('/long-title') }) },
        '/bad-schema': { body: page({ id: '/bad-schema', canonical: c('/bad-schema'), jsonld: ['{ not json', JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Shirt' })] }) },
        '/hidden': { body: page({ robots: 'noindex', canonical: c('/hidden') }) },
        '/dupe-a': { body: page({ title: 'Same | THE LOST+UNFOUNDS', canonical: c('/dupe-a') }) },
        '/dupe-b': { body: page({ title: 'Same | THE LOST+UNFOUNDS', canonical: c('/dupe-b') }) },
        '/thelostarchives/a-post': { body: page({ title: 'Post | THE LOST+UNFOUNDS', canonical: c('/thelostarchives/a-post'), og: false }) },
        '/ext-404': { status: 404, body: '' },
    };
}

async function withSite<T>(fn: (base: string, cfg: CrawlConfig) => Promise<T>): Promise<T> {
    let routes: ReturnType<typeof fixture> = {};
    const server = http.createServer((req, res) => {
        const r = routes[(req.url || '/').split('?')[0]];
        if (!r) { res.writeHead(404); res.end('no'); return; }
        res.writeHead(r.status ?? 200, { 'content-type': 'text/html; charset=utf-8', ...(r.headers ?? {}) });
        res.end(req.method === 'HEAD' ? undefined : r.body ?? '');
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    routes = fixture(base);
    try {
        return await fn(base, { ...DEFAULT_CONFIG, startUrl: `${base}/`, internalHosts: ['127.0.0.1'], timeoutMs: 5000 });
    } finally {
        server.close();
    }
}

async function crawl(cfg: CrawlConfig) {
    let state = await startCrawl(cfg);
    const pages: PageRecord[] = [];
    state = await crawlStep(state, cfg, Date.now() + 30_000, async (b) => { pages.push(...b); });
    return { state, pages, ...analyze(pages, state, cfg.internalHosts) };
}

const has = (issues: Issue[], code: string, path: string) => issues.some((i) => i.code === code && new URL(i.url).pathname === path);

test('finds every planted problem', async () => {
    await withSite(async (base, cfg) => {
        const { state, issues, stats } = await crawl(cfg);
        assert.equal(state.phase, 'done');
        assert.equal(state.robotsStatus, 200);

        assert.ok(has(issues, 'http_4xx', '/missing'), '404 page');
        assert.ok(has(issues, 'broken_internal_link', '/'), 'home links to a 404');
        assert.ok(has(issues, 'soft_404', '/nope'), 'soft 404');
        assert.ok(has(issues, 'redirect_chain', '/old'), 'two-hop redirect');
        assert.ok(has(issues, 'links_to_redirect', '/'), 'home links to a redirect');
        assert.ok(has(issues, 'sitemap_3xx', '/old'), 'redirect in sitemap');
        assert.ok(has(issues, 'sitemap_noindex', '/hidden'), 'noindex in sitemap');
        assert.ok(has(issues, 'sitemap_multiple', '/about'), 'in two sitemaps');
        assert.ok(has(issues, 'orphan', '/orphan'), 'orphan');
        assert.ok(!has(issues, 'orphan', '/about'), 'linked page is not an orphan');
        assert.ok(has(issues, 'title_too_long', '/long-title'));
        assert.ok(has(issues, 'meta_too_short', '/long-title'));
        assert.ok(has(issues, 'h1_missing', '/long-title'));
        assert.ok(has(issues, 'schema_invalid', '/bad-schema'));
        assert.ok(has(issues, 'title_duplicate', '/dupe-a') && has(issues, 'title_duplicate', '/dupe-b'));
        assert.ok(has(issues, 'duplicate_no_canonical', '/dupe-a'));
        assert.ok(has(issues, 'img_alt_missing', '/'));
        assert.ok(has(issues, 'schema_expected_missing', '/thelostarchives/a-post'), 'article without BlogPosting');
        assert.ok(has(issues, 'og_missing', '/thelostarchives/a-post'));
        assert.ok(has(issues, 'blocked_by_robots', '/'), 'link into a disallowed path');
        assert.ok(has(issues, 'broken_external_link', '/'), 'external 404');
        assert.ok(!state.seen.some((u) => u.includes('/private')), 'robots.txt Disallow respected');

        // Clean page: nothing but the informational single-link notice.
        const about = issues.filter((i) => new URL(i.url).pathname === '/about' && i.severity !== 'notice');
        assert.deepEqual(about, [], `about should be clean, got ${JSON.stringify(about)}`);
        // Noindex pages are not judged on content.
        assert.ok(!has(issues, 'title_duplicate', '/nope'));
        assert.ok(stats.healthScore > 0 && stats.healthScore < 100);
    });
});

test('a crawl split across many short steps finds the same issues', async () => {
    await withSite(async (_base, cfg) => {
        const whole = await crawl(cfg);
        let state = await startCrawl({ ...cfg, concurrency: 1 });
        const pages: PageRecord[] = [];
        let steps = 0;
        while (state.phase !== 'done' && steps < 200) {
            // Round-trip through JSON, as the database does between invocations.
            state = JSON.parse(JSON.stringify(await crawlStep(state, { ...cfg, concurrency: 1 }, Date.now() + 1, async (b) => { pages.push(...b); })));
            steps++;
        }
        assert.ok(steps > 3, `expected several steps, got ${steps}`);
        const split = analyze(pages, state, cfg.internalHosts);
        const key = (xs: Issue[]) => xs.map((i) => `${i.code} ${new URL(i.url).pathname}`).sort();
        // slow_page depends on timing; leave it out of the comparison.
        assert.deepEqual(key(split.issues.filter((i) => i.code !== 'slow_page')), key(whole.issues.filter((i) => i.code !== 'slow_page')));
    });
});

test('diff reports new and fixed URLs per issue type', () => {
    const before = [{ code: 'title_too_long' as const, url: 'a' }, { code: 'title_too_long' as const, url: 'b' }, { code: 'orphan' as const, url: 'x' }];
    const now = [{ code: 'title_too_long' as const, url: 'b' }, { code: 'title_too_long' as const, url: 'c' }];
    const d = Object.fromEntries(diffIssues(now, before).map((x) => [x.code, x]));
    assert.deepEqual(d.title_too_long.added, ['c']);
    assert.deepEqual(d.title_too_long.fixed, ['a']);
    assert.deepEqual(d.orphan.fixed, ['x']);
    assert.equal(d.orphan.now, 0);
    // First run: nothing is "new".
    assert.deepEqual(diffIssues(now, null).find((x) => x.code === 'title_too_long')!.added, []);
});

test('schema checks catch the City.addressRegion mistake and missing Product offers', () => {
    const r = checkJsonLd([JSON.stringify({
        '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'X', address: { '@type': 'PostalAddress' },
        areaServed: { '@type': 'City', name: 'Austin', addressRegion: 'TX' },
    }), JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Shirt' })]);
    assert.deepEqual(r.types, ['City', 'PostalAddress', 'Product', 'ProfessionalService']);
    assert.ok(r.problems.some((p) => /City does not take the property addressRegion/.test(p.message)));
    assert.ok(r.problems.some((p) => /Product is missing offers or review or aggregateRating/.test(p.message)));
    // The site's real BlogPosting shape passes.
    const ok = checkJsonLd([JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: 'H', author: { '@type': 'Organization', name: 'T' }, publisher: { '@type': 'Organization', name: 'T', logo: { '@type': 'ImageObject', url: 'u' } } })]);
    assert.deepEqual(ok.problems, []);
    // An OfferCatalog of services needs no price; a Product's offer does.
    const catalog = checkJsonLd([JSON.stringify({ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'X', address: 'A',
        hasOfferCatalog: { '@type': 'OfferCatalog', itemListElement: [{ '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'S' } }] } })]);
    assert.deepEqual(catalog.problems, []);
    const product = checkJsonLd([JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'P', offers: { '@type': 'Offer', price: '10' } })]);
    assert.ok(product.problems.some((p) => /Product Offer is missing priceCurrency/.test(p.message)));
});

test('parsers', () => {
    const p = parseHtml(`<html lang=en><head><title>A &amp; B</title><meta content="d" name=description><link rel="canonical" href="/x"></head>
      <body><!-- <a href="/commented">no</a> --><script>var s = '<a href="/in-script">'</script><h1>One <b>two</b></h1><a href='/y' rel="nofollow">Y</a><img src=/i.png alt=""></body></html>`);
    assert.deepEqual(p.titles, ['A & B']);
    assert.deepEqual(p.metaDescriptions, ['d']);
    assert.deepEqual(p.canonicals, ['/x']);
    assert.deepEqual(p.h1, ['One two']);
    assert.deepEqual(p.links.map((l) => l.href), ['/y']);
    assert.equal(p.links[0].rel, 'nofollow');
    assert.deepEqual(p.images, [{ src: '/i.png', alt: '' }]);
    assert.equal(p.lang, 'en');

    assert.deepEqual(parseSitemap('<sitemapindex><sitemap><loc>https://a/s1.xml</loc></sitemap></sitemapindex>'), { isIndex: true, locs: ['https://a/s1.xml'] });
    assert.deepEqual(parseSitemap('<urlset><url><loc>https://a/p</loc><image:image><image:loc>https://a/i.jpg</image:loc></image:image></url></urlset>').locs, ['https://a/p']);
    assert.deepEqual(parseRobots('User-agent: Googlebot\nDisallow: /g\n\nUser-agent: *\nDisallow: /api/\nAllow: /api/gallery/stream\nSitemap: https://a/s.xml'), { sitemaps: ['https://a/s.xml'], disallow: ['/api/'] });
});

test('links inside noscript count, as they do for a crawler that runs no JS', () => {
    const p = parseHtml('<html><body><noscript><div><a href="/services/airbnb-photography">Airbnb</a></div></noscript><div id="root"></div></body></html>');
    assert.deepEqual(p.links.map((l) => l.href), ['/services/airbnb-photography']);
});
