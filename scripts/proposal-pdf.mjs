#!/usr/bin/env node
/**
 * Render every client proposal to a print-ready PDF.
 *
 *   public/<client>-proposal.html  →  public/<client>-proposal.pdf
 *
 * The PDFs are committed and served statically, so each proposal has a stable
 * URL — https://www.thelostandunfounds.com/kattitude-proposal.pdf — that can be
 * linked in an email or attached directly. There is no runtime PDF endpoint on
 * purpose: proposals are static files, so editing one already requires a deploy,
 * and generating them ahead of time avoids shipping a headless browser into a
 * serverless function.
 *
 * Fonts are base64-embedded in public/proposal.css, so rendering needs no
 * network access and the PDF always carries Inter rather than a fallback.
 *
 * Usage:
 *   npm run proposal:pdf                    # all proposals
 *   node scripts/proposal-pdf.mjs kattitude # just the ones matching a filter
 *
 * Chromium is located via CHROME_PATH, then PLAYWRIGHT_BROWSERS_PATH, then the
 * usual system locations.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(browsersPath)) {
    // prefer headless_shell — lighter and more reliable in containers
    const dirs = readdirSync(browsersPath)
      .filter((d) => d.startsWith('chromium'))
      .sort((a, b) => (a.includes('headless') ? -1 : b.includes('headless') ? 1 : 0));
    for (const d of dirs) {
      for (const bin of ['chrome-linux/headless_shell', 'chrome-linux/chrome']) {
        const p = join(browsersPath, d, bin);
        if (existsSync(p)) return p;
      }
    }
  }

  for (const p of [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]) {
    if (existsSync(p)) return p;
  }

  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.error(
    'Could not find Chromium.\n' +
      'Set CHROME_PATH to a Chrome/Chromium binary, or install one, then re-run.'
  );
  process.exit(1);
}

const filter = process.argv[2];
const targets = readdirSync(publicDir)
  .filter((f) => /-(proposal|handover)\.html$/.test(f))
  .filter((f) => !filter || f.includes(filter));

if (targets.length === 0) {
  console.error(filter ? `No proposals matching "${filter}".` : 'No proposals found.');
  process.exit(1);
}

console.log(`Using ${chrome}\n`);

let failed = 0;

for (const file of targets) {
  const src = join(publicDir, file);
  const out = join(publicDir, file.replace(/\.html$/, '.pdf'));

  try {
    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--virtual-time-budget=5000',
        '--no-pdf-header-footer',
        `--print-to-pdf=${out}`,
        `file://${src}`,
      ],
      { stdio: 'pipe', timeout: 90_000 }
    );
  } catch (err) {
    console.error(`✗ ${file}: ${err.message.split('\n')[0]}`);
    failed++;
    continue;
  }

  if (!existsSync(out) || statSync(out).size === 0) {
    console.error(`✗ ${file}: no output produced`);
    failed++;
    continue;
  }

  const kb = Math.round(statSync(out).size / 1024);
  console.log(`✓ ${file.replace(/\.html$/, '.pdf')}  (${kb} KB)`);
}

if (failed > 0) {
  console.error(`\n${failed} proposal(s) failed to render.`);
  process.exit(1);
}

console.log(`\nDone — ${targets.length} PDF(s) written to public/.`);
