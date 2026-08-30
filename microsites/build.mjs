#!/usr/bin/env node
/**
 * Microsite generator.
 *
 *   node microsites/build.mjs <site-id> [--draft] [--serve]
 *
 * Reads a site's config + content, generates the page matrix, renders static
 * HTML, then runs every output through a set of gates before it is allowed to
 * count as a build.
 *
 * Zero dependencies on purpose. A microsite is 16 static pages; pulling a
 * framework and its transitive tree in to produce them adds a CVE surface
 * (see the `dep-security` skill) and a lockfile to maintain, for no output
 * the platform cannot already produce. Nothing here is framework-specific,
 * so the content directory ports to Astro unchanged if that ever earns its
 * keep.
 *
 * THE GATES — each one can fail, and each one has been verified failing.
 * A check that cannot fail is not a check (CLAUDE.md, Evidence Rule 5).
 *
 *   1. placeholders  — no REPLACE_ME_* token survives into a production build
 *   2. design        — no border / shadow / outline / gradient / non-zero
 *                      radius reaches the output (no-border-design is the
 *                      authority; noir-design defers to it)
 *   3. headings      — exactly one h1 per page, and it is UPPERCASE
 *                      (CLAUDE.md Page Title Style Rule)
 *   4. meta          — title <= 60 chars, description 70-165, both unique
 *   5. links         — every internal href resolves to a generated page
 *   6. similarity    — no two pages exceed the near-duplicate threshold
 *   7. legal         — the trust/legal set has been read by a human before
 *                      a production build ships pages that make commitments
 *                      about how personal data is handled
 *
 * Gate 6 is the one that matters most and the one no microsite course
 * enforces. Google's March 2024 spam policies name "scaled content abuse"
 * explicitly, and mass-produced templated local pages are the stated target.
 * A generator that emits 1,000 pages differing only by city name is building
 * the exact artifact the policy describes. This gate makes that failure loud
 * at build time instead of silent at deindex time.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from './lib/render.mjs';
import { head, sitemap, robots, pathOf, HEAD_SCRIPTS_OPEN, HEAD_SCRIPTS_CLOSE } from './lib/seo.mjs';
import { legalPages } from './lib/legal.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const siteId = args.find((a) => !a.startsWith('--'));
const DRAFT = args.includes('--draft');

if (!siteId) {
  console.error('usage: node microsites/build.mjs <site-id> [--draft]');
  process.exit(1);
}

const siteDir = join(ROOT, 'sites', siteId);
if (!existsSync(siteDir)) {
  console.error(`No such site: ${siteId}\nExpected ${siteDir}`);
  process.exit(1);
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const site = readJson(join(siteDir, 'site.json'));
const areas = readJson(join(siteDir, 'content', 'areas.json'));
const corePages = readJson(join(siteDir, 'content', 'pages.json'));

/* ------------------------------------------------------------------ *
 * The page matrix.
 *
 * Core pages are hand-authored. Area pages are generated — but each one
 * is generated from area-specific research (a real local shooting
 * challenge, a real local tip), not from a string template with the
 * neighborhood name swapped in. That distinction is the whole game;
 * gate 6 below is what keeps it honest.
 * ------------------------------------------------------------------ */
/**
 * Titles are picked from a ladder rather than one template, because a fixed
 * template overflows 60 characters on the longer neighborhood names and
 * Google truncates the tail — which is where the qualifier lives.
 */
function areaTitle(name) {
  const candidates = [
    // No "STR" here: this is SERP-facing copy and the acronym is trade jargon
    // a casual host does not necessarily parse. Dropping it also buys back the
    // characters that had these titles sitting right on the 60-char ceiling.
    `Airbnb Photography in ${name} | From $195`,
    `Airbnb Photography in ${name} | Austin`,
    `Airbnb Photography — ${name}`,
  ];
  return candidates.find((t) => t.length <= 60) ?? candidates[candidates.length - 1];
}

function areaPage(area) {
  const others = areas.filter((a) => a.slug !== area.slug);
  return {
    slug: `areas/${area.slug}`,
    type: 'area',
    title: areaTitle(area.name),
    description: `Short-term rental photography in ${area.name}, Austin. ${area.typical}. Flat rates from $195, 24–72 hour delivery.`,
    h1: `Airbnb Photography in ${area.name}`,
    blocks: [
      {
        type: 'hero',
        kicker: `${area.zips.join(' · ')} · near ${area.landmark}`,
        sub: area.blurb,
        primary: { label: 'Get a quote', href: '/contact/' },
        secondary: { label: 'See pricing', href: '/pricing/' },
      },
      { type: 'prose', heading: `Shooting short-term rentals in ${area.name}`, body: [area.challenge] },
      { type: 'prose', heading: 'Local note', body: [area.tip] },
      { type: 'pricing', heading: 'Rates', note: `No travel fee to ${area.name} — it is inside the ${site.geo.serviceRadiusMiles}-mile radius.` },
      {
        type: 'faq',
        heading: `${area.name} questions`,
        items: [
          {
            q: `What does Airbnb photography cost in ${area.name}?`,
            a: `The same flat rates as the rest of the Austin metro: $195 for a studio or 1BR, $265 for a 2BR, $335 for a 3BR, and from $425 for 4BR and luxury properties. ${area.name} is inside the ${site.geo.serviceRadiusMiles}-mile radius, so there is no travel fee.`,
          },
          {
            q: `What is typical for a ${area.name} short-term rental?`,
            a: `${area.typical}. ${area.challenge}`,
          },
        ],
      },
      { type: 'areas', heading: 'Other areas we cover' },
      { type: 'cta', heading: `Book a ${area.name} shoot`, body: 'Send the address and bedroom count for a fixed price the same day.', button: { label: 'Request a quote', href: '/contact/' } },
    ],
    _others: others,
  };
}

const pages = [...corePages, ...areas.map(areaPage), ...legalPages(site)];

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */
const outDir = join(ROOT, 'dist', siteId);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const rendered = new Map();
for (const page of pages) {
  const ctx = { site, areas, pages, page, path: pathOf(page), draft: DRAFT };
  const html = renderPage(ctx, head(site, page, { draft: DRAFT }));
  const dest = join(outDir, page.slug, 'index.html');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  rendered.set(pathOf(page), html);
}

writeFileSync(join(outDir, 'sitemap.xml'), sitemap(site, pages));
writeFileSync(join(outDir, 'robots.txt'), robots(site, { draft: DRAFT }));
writeFileSync(
  join(outDir, 'vercel.json'),
  JSON.stringify({ trailingSlash: true, cleanUrls: false }, null, 2) + '\n'
);

/* ------------------------------------------------------------------ *
 * Gates
 * ------------------------------------------------------------------ */
const errors = [];
const warns = [];
const fail = (gate, msg) => errors.push(`[${gate}] ${msg}`);
const warn = (gate, msg) => warns.push(`[${gate}] ${msg}`);

/* --- 1. placeholders --- */
{
  const raw = JSON.stringify(site) + [...rendered.values()].join('');
  const hits = [...new Set(raw.match(/REPLACE_ME[A-Z_]*/g) || [])];
  for (const h of hits) {
    if (DRAFT) warn('placeholders', `${h} still unset (draft build — noindex + robots Disallow applied)`);
    else fail('placeholders', `${h} is still a placeholder. Set it in site.json, or build with --draft.`);
  }
}

/* --- 2. design --- *
 * Only flags declarations that actually paint a border, shadow, outline or
 * gradient. `border:0` removes a UA default and `border-radius:0` is required
 * by noir-design ("It is required here and is not a violation of the
 * no-border rule despite the property name"), so both must pass. */
{
  const banned = [
    [/border(?:-(?:top|right|bottom|left))?\s*:\s*(?!0|none)[^;]+/gi, 'painted border'],
    [/border-radius\s*:\s*(?!0)[^;]+/gi, 'non-zero border-radius'],
    [/box-shadow\s*:\s*(?!none)[^;]+/gi, 'box-shadow'],
    [/text-shadow\s*:\s*(?!none)[^;]+/gi, 'text-shadow'],
    [/outline\s*:\s*(?!none|0)[^;]+/gi, 'outline'],
    [/(?:linear|radial|conic)-gradient/gi, 'gradient'],
    [/class="[^"]*\b(?:border|shadow|ring|rounded)(?:-[\w/]+)?\b[^"]*"/gi, 'banned utility class'],
  ];
  // Third-party analytics / call-tracking markup is not ours to lint; failing
  // our build over a vendor's inline shadow would be a false positive.
  const stripVendor = (html) => {
    const a = html.indexOf(HEAD_SCRIPTS_OPEN);
    if (a === -1) return html;
    const b = html.indexOf(HEAD_SCRIPTS_CLOSE, a);
    return b === -1 ? html.slice(0, a) : html.slice(0, a) + html.slice(b + HEAD_SCRIPTS_CLOSE.length);
  };
  for (const [path, html] of rendered) {
    const ours = stripVendor(html);
    for (const [re, label] of banned) {
      const m = ours.match(re);
      if (m) fail('design', `${path} — ${label}: ${[...new Set(m)].slice(0, 3).join(' | ')}`);
    }
  }
}

/* --- 3. headings --- */
{
  for (const [path, html] of rendered) {
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );
    if (h1s.length !== 1) fail('headings', `${path} — expected exactly 1 <h1>, found ${h1s.length}`);
    // noir-design applies text-transform:uppercase in CSS, so the source
    // text is title case by design. What must not happen is a lowercase h1
    // that renders lowercase because the rule was stripped.
    const css = html.match(/h1\{[^}]*\}/);
    if (!css || !/text-transform:uppercase/.test(css[0]))
      fail('headings', `${path} — h1 is missing text-transform:uppercase (Page Title Style Rule)`);
  }
}

/* --- 4. meta --- */
{
  const titles = new Map();
  const descs = new Map();
  for (const page of pages) {
    const p = pathOf(page);
    if (page.title.length > 60) warn('meta', `${p} — title is ${page.title.length} chars (>60 truncates in SERP)`);
    if (page.description.length < 70 || page.description.length > 165)
      warn('meta', `${p} — description is ${page.description.length} chars (aim 70–165)`);
    if (titles.has(page.title)) fail('meta', `${p} — duplicate title, same as ${titles.get(page.title)}`);
    if (descs.has(page.description)) fail('meta', `${p} — duplicate description, same as ${descs.get(page.description)}`);
    titles.set(page.title, p);
    descs.set(page.description, p);
  }
}

/* --- 5. links --- */
{
  const valid = new Set(rendered.keys());
  for (const [path, html] of rendered) {
    const hrefs = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]);
    for (const h of new Set(hrefs)) {
      if (!valid.has(h)) fail('links', `${path} — broken internal link to ${h}`);
    }
  }
}

/* --- 6. similarity --- *
 * Jaccard overlap on 6-word shingles of the <main> text. Templated pages
 * that differ only by a proper noun score very high here; genuinely
 * researched pages that share a pricing table and a CTA sit far lower. */
{
  const text = (html) => {
    const main = (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0];
    return main
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };
  const shingles = (words, n = 6) => {
    const s = new Set();
    for (let i = 0; i + n <= words.length; i++) s.add(words.slice(i, i + n).join(' '));
    return s;
  };
  const jaccard = (a, b) => {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return inter / (a.size + b.size - inter || 1);
  };

  const THRESHOLD = 0.5;
  const sets = [...rendered].map(([path, html]) => [path, shingles(text(html))]);
  let worst = { score: 0, pair: null };

  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const score = jaccard(sets[i][1], sets[j][1]);
      if (score > worst.score) worst = { score, pair: [sets[i][0], sets[j][0]] };
      if (score >= THRESHOLD)
        fail(
          'similarity',
          `${sets[i][0]} and ${sets[j][0]} are ${(score * 100).toFixed(0)}% identical ` +
            `(limit ${THRESHOLD * 100}%). Templated near-duplicates are what Google's ` +
            `scaled-content-abuse policy targets — rewrite one with real local detail.`
        );
    }
  }
  if (worst.pair)
    console.log(
      `  similarity   closest pair ${(worst.score * 100).toFixed(1)}% ` +
        `(${worst.pair[0]} ↔ ${worst.pair[1]}) — limit ${THRESHOLD * 100}%`
    );
}

/* --- 7b. fact staleness --- *
 * A page carrying municipal or regulatory claims goes stale silently, and a
 * wrong fee or deadline on a page people act on is worse than no page. Warn
 * once the check date passes 90 days so it gets re-verified rather than
 * quietly rotting. A warning, not a failure: the page is not wrong yet. */
{
  const MAX_AGE_DAYS = 90;
  for (const page of pages) {
    if (!page.factsCheckedOn) continue;
    const age = Math.floor((Date.now() - Date.parse(page.factsCheckedOn)) / 86400000);
    if (age > MAX_AGE_DAYS)
      warn(
        'facts',
        `${pathOf(page)} — external facts last checked ${age} days ago ` +
          `(${page.factsCheckedOn}). Re-verify against the cited sources and bump factsCheckedOn.`
      );
  }
}

/* --- 7. legal --- *
 * The trust pages state how personal data is handled and what the service
 * commits to. Generated text is a starting draft, not advice, and shipping an
 * unread privacy policy on a site that collects names, emails and property
 * addresses is a real exposure rather than a style problem. Draft builds warn;
 * production refuses. Flip `legal.reviewed` once a human has actually read it. */
{
  const legal = site.legal ?? {};
  if (!legal.reviewed) {
    const msg =
      'legal pages have not been marked reviewed. Read /about/, /faq/, ' +
      '/privacy-policy/, /terms/ and /accessibility/, then set legal.reviewed ' +
      'and legal.reviewedBy in site.json.';
    if (DRAFT) warn('legal', msg);
    else fail('legal', msg);
  } else if (!legal.reviewedBy) {
    fail('legal', 'legal.reviewed is true but legal.reviewedBy is empty — record who reviewed them.');
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
console.log(`\n${site.brand} — https://${site.domain}${DRAFT ? '  [DRAFT]' : ''}`);
console.log(
  `  pages        ${pages.length} (${corePages.length} authored + ${areas.length} area + ${legalPages(site).length} trust/legal)`
);
console.log(`  output       microsites/dist/${siteId}`);

if (warns.length) {
  console.log(`\n  ${warns.length} warning(s):`);
  warns.forEach((w) => console.log(`    ! ${w}`));
}

if (errors.length) {
  console.log(`\n  ${errors.length} error(s):`);
  errors.forEach((e) => console.log(`    x ${e}`));
  console.log('\nBUILD FAILED\n');
  process.exit(1);
}

console.log(`\n  all 7 gates passed\n`);
