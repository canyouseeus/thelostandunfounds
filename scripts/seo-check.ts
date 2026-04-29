/**
 * SEO Validation Script
 *
 * Catches the SEO regressions Ahrefs has been flagging on every deploy:
 *   1. Internal `<Link to="/...">` and `<a href="/...">` references that point
 *      to a route App.tsx doesn't define.
 *   2. Pages rendered through `Helmet` / `SEOHead` whose <title> doesn't begin
 *      with the brand "THE LOST+UNFOUNDS".
 *   3. Pages missing a meta description.
 *   4. Routes that should be noindex (admin/debug surfaces) but aren't.
 *
 * Run during postbuild or by hand:
 *   npx tsx scripts/seo-check.ts            # warn-only
 *   npx tsx scripts/seo-check.ts --strict   # exits non-zero on critical issues
 *
 * Exits non-zero (failing the build) when --strict is set and any critical
 * issue is found, so they can never make it to production again.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const APP_TSX = join(SRC, 'App.tsx');
const BRAND = 'THE LOST+UNFOUNDS';

const STRICT = process.argv.includes('--strict');

type Issue = { severity: 'error' | 'warn'; file: string; message: string };
const issues: Issue[] = [];

function record(severity: 'error' | 'warn', file: string, message: string) {
  issues.push({ severity, file: relative(ROOT, file), message });
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith('.bak') && !entry.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/* ---------- 1. Extract concrete routes from App.tsx ---------- */

function extractDefinedRoutes(): { literal: Set<string>; patterns: RegExp[] } {
  const src = readFileSync(APP_TSX, 'utf8');
  const literal = new Set<string>();
  literal.add('/');
  const patterns: RegExp[] = [];

  // Captures: <Route path="/foo" ...> or <Route path="/foo/:bar" ...>
  const routeRegex = /<Route\s+[^>]*path=["']([^"']+)["']/g;
  // Captures: <Navigate to="/foo" />
  const navigateRegex = /<Navigate\s+[^>]*to=["']([^"']+)["']/g;

  // Build a parent-stack so we can rebuild absolute paths from nested
  // <Route path="parent">…<Route path="child" /></Route> declarations.
  const lines = src.split('\n');
  const stack: string[] = [''];
  for (const line of lines) {
    const open = line.match(/<Route\s+path=["']([^"']+)["'][^/]*?>(?!.*\/>)/);
    const selfClose = line.match(/<Route\s+[^>]*path=["']([^"']+)["'][^>]*\/>/);
    const indexOnly = /<Route\s+index/.test(line);
    const close = /<\/Route>/.test(line);

    const captured = (selfClose && selfClose[1]) || (open && open[1]);
    if (captured) {
      const parent = stack[stack.length - 1];
      const joined = captured.startsWith('/')
        ? captured
        : (parent.replace(/\/$/, '') + '/' + captured).replace(/\/+/g, '/');
      addRoute(joined);
      if (open && !selfClose) stack.push(joined);
    } else if (indexOnly) {
      addRoute(stack[stack.length - 1] || '/');
    }
    if (close && stack.length > 1) stack.pop();
  }

  // Backstop: also pick up any Route path we missed via the simple regex
  let m: RegExpExecArray | null;
  while ((m = routeRegex.exec(src)) !== null) addRoute(m[1]);
  while ((m = navigateRegex.exec(src)) !== null) addRoute(m[1]);

  function addRoute(path: string) {
    if (!path) return;
    if (path === '*') return;
    if (path.includes(':') || path.includes('*')) {
      // Convert "/blog/:subdomain/:slug" → /^\/blog\/[^/]+\/[^/]+$/
      const re = '^' + path.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*') + '$';
      patterns.push(new RegExp(re));
    } else {
      literal.add(path.replace(/\/+$/, '') || '/');
    }
  }

  return { literal, patterns };
}

function isRouteKnown(
  to: string,
  defined: { literal: Set<string>; patterns: RegExp[] }
): boolean {
  // Strip query/hash before matching the pathname
  const path = to.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
  if (defined.literal.has(path)) return true;
  return defined.patterns.some((re) => re.test(path));
}

/* ---------- 2. Check internal links ---------- */

const SKIP_LINK_PATHS = new Set<string>([
  '/api', // server-rendered, intentionally not a Route
]);

function checkInternalLinks(defined: ReturnType<typeof extractDefinedRoutes>) {
  const files = walk(SRC);
  const linkRegex = /\b(?:to|href)=(?:["'])(\/[^"'#?]*?)(?:["'])/g;

  for (const file of files) {
    if (file.endsWith('App.tsx')) continue;
    const src = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(src)) !== null) {
      const target = m[1];
      // Skip API/asset paths, anchor-only, and template-string segments.
      if (target.startsWith('/api/') || target.startsWith('/api')) continue;
      if (target.startsWith('/_next') || target.startsWith('/assets/')) continue;
      if (SKIP_LINK_PATHS.has(target)) continue;
      if (target.endsWith('.png') || target.endsWith('.svg') || target.endsWith('.jpg')) continue;
      if (!isRouteKnown(target, defined)) {
        record(
          'error',
          file,
          `Internal link "${target}" points to a route App.tsx doesn't define.`
        );
      }
    }
  }
}

/* ---------- 3. Check titles + descriptions on page components ---------- */

function checkPageMeta() {
  const pageDir = join(SRC, 'pages');
  if (!existsSync(pageDir)) return;
  const files = walk(pageDir);

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const usesHelmet = /<Helmet[\s>]/.test(src);
    const usesSEOHead = /<SEOHead[\s>]/.test(src);
    if (!usesHelmet && !usesSEOHead) continue;

    // Title format check (brand must come first).
    const titleMatches = [...src.matchAll(/<title>([^<]+)<\/title>/g)];
    for (const t of titleMatches) {
      const raw = t[1].trim();
      // Skip JSX expressions wrapping the brand — they're hard to statically resolve
      // but we still flag obvious "X | THE LOST+UNFOUNDS" suffix patterns.
      if (raw.includes('{') && raw.includes('}')) {
        if (raw.includes('| THE LOST+UNFOUNDS') && !raw.startsWith('THE LOST+UNFOUNDS')) {
          record('error', file, `Title "${raw}" puts brand last; brand must come first.`);
        }
        continue;
      }
      if (raw === BRAND) continue; // homepage exception
      if (!raw.toUpperCase().startsWith(BRAND)) {
        record('error', file, `Title "${raw}" must start with "${BRAND}".`);
      }
    }

    // SEOHead title prop — detect strings already containing the brand.
    const seoTitleMatches = [...src.matchAll(/<SEOHead[\s\S]*?title=(["'])([^"']+?)\1/g)];
    for (const m of seoTitleMatches) {
      const raw = m[2];
      if (raw.includes(BRAND)) {
        record(
          'error',
          file,
          `SEOHead title="${raw}" includes the brand; pass only the page name — SEOHead prefixes the brand for you.`
        );
      }
    }

    // Description must exist (either from SEOHead or inline meta).
    const hasInlineDesc = /<meta[^>]+name=["']description["']/.test(src);
    const hasSEOHeadDesc = /<SEOHead[\s\S]*?description=/.test(src);
    if (!hasInlineDesc && !hasSEOHeadDesc) {
      record('error', file, 'Page is missing a meta description.');
    }

    // Duplicate <title> tags inside one Helmet are a real problem.
    if (titleMatches.length > 1) {
      // Allow ternary-style branches that produce a single rendered title.
      const helmetBlocks = src.match(/<Helmet>[\s\S]*?<\/Helmet>/g) || [];
      for (const block of helmetBlocks) {
        const inner = (block.match(/<title>/g) || []).length;
        if (inner > 1) {
          // Check if it's wrapped in a JSX conditional ({cond ? <title>…</title> : <title>…</title>})
          // — those render only one. Otherwise flag it.
          const isConditional = /\{\s*[A-Za-z0-9_]+\s*\?\s*\(\s*<title>/.test(block);
          if (!isConditional) {
            record('error', file, 'Helmet block contains multiple <title> tags.');
          }
        }
      }
    }
  }
}

/* ---------- 4. Sitemap sanity ---------- */

function checkSitemap() {
  const sitemapPath = join(ROOT, 'public', 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    record('warn', sitemapPath, 'public/sitemap.xml is missing.');
    return;
  }
  const xml = readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const banned = ['/api/', '/admin', '/debug', '/sagemode', '/designsystem', '/setup', '/preview/'];
  for (const loc of locs) {
    for (const b of banned) {
      if (loc.includes(b)) {
        record('error', sitemapPath, `Sitemap should not list ${loc} (matches ${b}).`);
      }
    }
  }
}

/* ---------- 5. robots.txt sanity ---------- */

function checkRobots() {
  const robotsPath = join(ROOT, 'public', 'robots.txt');
  if (!existsSync(robotsPath)) {
    record('error', robotsPath, 'public/robots.txt is missing.');
    return;
  }
  const text = readFileSync(robotsPath, 'utf8');
  if (!/Disallow:\s*\/api/.test(text)) {
    record('error', robotsPath, 'robots.txt must Disallow /api/* routes.');
  }
  if (!/Sitemap:\s+https?:\/\//.test(text)) {
    record('error', robotsPath, 'robots.txt must reference an absolute Sitemap URL.');
  }
}

/* ---------- Run ---------- */

function run() {
  const defined = extractDefinedRoutes();
  checkInternalLinks(defined);
  checkPageMeta();
  checkSitemap();
  checkRobots();

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  for (const i of issues) {
    const tag = i.severity === 'error' ? 'ERROR' : 'WARN ';
    console.log(`[${tag}] ${i.file}: ${i.message}`);
  }

  console.log('');
  console.log(`SEO check complete. ${errors.length} error(s), ${warnings.length} warning(s).`);

  if (STRICT && errors.length > 0) {
    console.error('SEO check failed in --strict mode. Fix the errors above before deploying.');
    process.exit(1);
  }
}

run();
