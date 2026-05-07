/**
 * Build-time 404/Fallback Page Generator
 *
 * Why this exists:
 * The Vercel catch-all rewrite (see vercel.json) maps every unmatched URL to
 * the SPA shell. Without this script, that shell is `dist/index.html` — the
 * homepage. That means crawlers hitting unpublished drafts, admin-only routes
 * (like /booking), or any URL we haven't pre-rendered see the SAME homepage
 * markup at every URL, which Ahrefs/Google flag as duplicate content.
 *
 * The fix: build a sibling `dist/404.html` that is identical to the SPA shell
 * except it carries `<meta name="robots" content="noindex, nofollow">`. The
 * Vercel rewrite is then pointed at `/404.html` instead of `/index.html`, so:
 *
 *   - Real pre-rendered routes (e.g. dist/about/index.html) are served first
 *     and remain indexable with their per-page meta.
 *   - The homepage `dist/index.html` is served at `/` and stays indexable.
 *   - Anything else (drafts, admin-only pages, typos) falls through the
 *     rewrite and gets the noindex shell.
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const NOINDEX_META = '<meta name="robots" content="noindex, nofollow" />';

async function generate404Html() {
  console.log('🚧 Generating dist/404.html (SPA shell with noindex)...');

  const distPath = join(process.cwd(), 'dist');
  const sourcePath = join(distPath, 'index.html');
  const targetPath = join(distPath, '404.html');

  let html: string;
  try {
    html = await readFile(sourcePath, 'utf-8');
  } catch (err) {
    console.error('❌ Could not read dist/index.html. Run `vite build` first.');
    process.exit(1);
  }

  // Replace any existing robots meta tag, otherwise inject before </head>.
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, NOINDEX_META);
  } else {
    html = html.replace('</head>', `  ${NOINDEX_META}\n</head>`);
  }

  // Make the title generic so the noindex shell does not parrot the homepage.
  // Without a unique title Ahrefs/Google still cluster these URLs together
  // even when noindex eventually drops them — the unique title keeps the
  // crawler from treating intermediate snapshots as duplicates of `/`.
  html = html.replace(
    /<title>.*?<\/title>/i,
    '<title>Not Found | THE LOST+UNFOUNDS</title>'
  );

  await writeFile(targetPath, html, 'utf-8');
  console.log(`✅ Wrote ${targetPath}`);
}

generate404Html().catch((err) => {
  console.error('Fatal error generating 404.html:', err);
  process.exit(1);
});
