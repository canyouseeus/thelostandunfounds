#!/usr/bin/env node
/**
 * Brand voice check: no em dashes (—) or en dashes (–) in anything we write.
 *
 * The rule is a writing rule, so two uses are deliberately allowed:
 *   1. The "no value" placeholder glyph in data tables, e.g. `?? '—'`. That is a
 *      typographic mark in the UI, not a sentence.
 *   2. A dash inside a regex character class, e.g. /[—–⸻]/g, which is how the
 *      blog sanitisers strip these characters out of submitted copy.
 * Lines that talk *about* dashes (the contributor writing prompts, this file)
 * are allowed to quote the characters they are banning.
 *
 * Usage: npm run check:dashes
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|md|html|css|sh|py|sql|json)$/;
const DASH = /[—–]/;
const MENTIONS_DASH = /em[\s-]?dash|en[\s-]?dash|long dashes/i;
const SELF = 'scripts/check-dashes.mjs';

/** True when this dash is an allowed glyph rather than prose punctuation. */
function isAllowed(line, idx) {
  const before = line.slice(0, idx);
  const after = line.slice(idx + 1);
  const prev = before.slice(-1);
  const next = after.slice(0, 1);

  // Placeholder glyph: the dash touches a quote and the literal holds no letters.
  for (const q of ["'", '"', '`']) {
    if (prev !== q && next !== q) continue;
    const open = before.lastIndexOf(q);
    const close = after.indexOf(q);
    if (open === -1 || close === -1) continue;
    if (!/[A-Za-z]/.test(before.slice(open + 1) + after.slice(0, close))) return true;
  }

  // Regex character class holding nothing but dash characters, e.g. /[—–⸻]/g or the
  // string form "[—–-]?". The class must be unclosed to our left and closed to our
  // right, and may contain only dashes, hyphens and escapes. Prose never qualifies.
  const open = before.lastIndexOf('[');
  const close = after.indexOf(']');
  if (open !== -1 && close !== -1 && !before.slice(open).includes(']')) {
    const cls = before.slice(open + 1) + line[idx] + after.slice(0, close);
    // Either the class holds nothing but dashes and escapes, or it is delimited as
    // a regex literal. Prose satisfies neither.
    if (/^[—–⸻\-\\sSwWdD]*$/.test(cls)) return true;
    if (before[open - 1] === '/' || before[open - 1] === '\\' || after[close + 1] === '/') return true;
  }

  return false;
}

// Tracked files plus new, non-ignored ones. A check that cannot see a brand new
// file is a check that passes because its input is missing.
const files = [
  ...new Set(
    execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' }).split('\n'),
  ),
].filter((f) => f && EXT.test(f) && f !== SELF);

const violations = [];

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!DASH.test(src)) continue;

  src.split('\n').forEach((line, i) => {
    if (!DASH.test(line) || MENTIONS_DASH.test(line)) return;
    for (let c = 0; c < line.length; c++) {
      if (!DASH.test(line[c]) || isAllowed(line, c)) continue;
      violations.push({ file, line: i + 1, text: line.trim() });
      return;
    }
  });
}

if (violations.length) {
  console.error(`\n✖ ${violations.length} line(s) use an em or en dash. Brand voice bans both.\n`);
  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text.slice(0, 140)}`);
  }
  if (violations.length > 40) console.error(`  ... and ${violations.length - 40} more`);
  console.error('\n  Use a comma, colon, semicolon, full stop, or parentheses instead.');
  console.error('  See the NO EM DASHES rule in CLAUDE.md.\n');
  process.exit(1);
}

console.log(`✓ no em or en dashes in ${files.length} files`);
