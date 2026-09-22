#!/usr/bin/env node
/**
 * Sync the shared proposal stylesheet into every client proposal.
 *
 * Source of truth:  public/proposal.css
 * Targets:          public/*-proposal.html
 *
 * Why inline rather than <link>: proposals are emailed as attachments and saved
 * to disk. An external stylesheet would arrive unstyled. So the shared CSS is
 * copied into each document, and this script keeps those copies honest.
 *
 * Each proposal contains:
 *
 *   <!-- proposal-css:start -->
 *   <style> ...generated, do not edit... </style>
 *   <!-- proposal-css:end -->
 *   <style> ...optional per-document overrides, hand-edited... </style>
 *
 * Only the marked region is rewritten. Overrides after the end marker survive.
 *
 * Usage:
 *   node scripts/sync-proposal-css.mjs          # write
 *   node scripts/sync-proposal-css.mjs --check  # verify only, non-zero if stale
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'public', 'proposal.css');
const publicDir = join(root, 'public');

const START = '<!-- proposal-css:start -->';
const END = '<!-- proposal-css:end -->';

const css = readFileSync(cssPath, 'utf8').trimEnd();
const block = [
  START,
  '<style>',
  '/* GENERATED from public/proposal.css — do not edit here.',
  '   Edit the stylesheet, then run: npm run proposal:css */',
  css,
  '</style>',
  END,
].join('\n');

const checkOnly = process.argv.includes('--check');
const CLIENT_DOC = /-(proposal|handover)\.html$/;
const targets = readdirSync(publicDir).filter((f) => CLIENT_DOC.test(f));

let stale = 0;
let written = 0;

for (const file of targets) {
  const path = join(publicDir, file);
  const html = readFileSync(path, 'utf8');

  const start = html.indexOf(START);
  const end = html.indexOf(END);

  if (start === -1 || end === -1) {
    console.error(`✗ ${file}: missing ${START} / ${END} markers — skipped`);
    stale++;
    continue;
  }

  const next = html.slice(0, start) + block + html.slice(end + END.length);

  if (next === html) {
    console.log(`  ${file}: up to date`);
    continue;
  }

  if (checkOnly) {
    console.error(`✗ ${file}: OUT OF DATE with public/proposal.css`);
    stale++;
    continue;
  }

  writeFileSync(path, next);
  console.log(`✓ ${file}: updated`);
  written++;
}

if (checkOnly && stale > 0) {
  console.error(`\n${stale} proposal(s) out of sync. Run: npm run proposal:css`);
  process.exit(1);
}

if (!checkOnly) {
  console.log(`\nDone — ${written} updated, ${targets.length - written} already current.`);
}
