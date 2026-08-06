#!/usr/bin/env node
/**
 * Generate the public changelog from git history.
 *
 * The public changelog is a *sanitised* view of the commit log. Commit subjects
 * are written for us, not for the public: they name clients, people, prices and
 * internal debugging. This script does three things, in order:
 *
 *   1. DROP  — noise that means nothing to a reader (redeploy triggers, WIP,
 *              reverts, build-error chasing, debug logging).
 *   2. FOLD  — any commit touching named client work is replaced wholesale with
 *              a generic line. We never try to "clean" a client subject in
 *              place; the whole sentence goes.
 *   3. TIDY  — strip conventional-commit prefixes and PR numbers, sentence-case.
 *
 * A final assertion scans the output for every redacted term and for anything
 * shaped like an email address. If one survives, the script exits non-zero and
 * writes nothing. Run `node scripts/generate-changelog.mjs --check` to verify
 * the committed file is current without rewriting it.
 *
 * Output: src/data/changelog.json (committed, because Vercel clones shallow and
 * cannot see the full history at build time).
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/data/changelog.json')

/* ------------------------------------------------------------------ *
 * 1. Noise — dropped entirely.
 * ------------------------------------------------------------------ */
const DROP = [
  /^revert[:(\s"]/i,
  /^(chore|debug|wip)\b.*\b(redeploy|deploy|trigger|logging|log |diagnos|temporary|snapshot|test)/i,
  /^(debug|wip)\b/i,
  /^trigger redeploy/i,
  /^force redeploy/i,
  /^add (debug|diagnostic|health check)/i,
  /^(chore|build)\(?[a-z-]*\)?:? ?(bump|snapshot|remove accidentally)/i,
  /^merge /i,
  /\bsyntax error\b/i,
  /\b(TS\d{4}|ERR_MODULE_NOT_FOUND)\b/,
  /^fix(\([a-z-]+\))?: ?(build|ci)\b/i,
  /^fix build/i,
  /unblock (vercel|the) (ts|build)/i,
  // Internal agent tooling — rules, skills and workflows. Real work, but it is
  // about how the site gets built, not about the site.
  /\b(skill|CLAUDE\.md|AGENTS\.md|cursorrules|cursor rule|slash command|ralph-loop|preflight|workflow system|agent-first)\b/i,
  /^docs?\(/i,
  /^(build-the-endpoint|email-billing|email-rendering|dep-security|brand-ethos|supabase-mcp)\b/i,
]

/** Conventional-commit prefixes that carry no meaning for a reader. */
const PREFIX =
  /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revise|rebuild|design|refine|wip)(\([a-z0-9,\-/ .]+\))?:\s*/i

/* ------------------------------------------------------------------ *
 * 2. Client + personal identifiers.
 *
 * `term` is what must never appear in the output. `as` is the generic line the
 * whole commit collapses to. Keep `term` lowercase — matching is case-insensitive
 * and word-boundary anchored so ordinary words are not caught by accident.
 * ------------------------------------------------------------------ */
const CLIENT_WORK = 'Client project work — proposal, preview site and dashboard mockups'
const CLIENT_SEND = 'Client project work — proposal delivery and document email'

const REDACT = [
  { term: 'kattitude', as: CLIENT_WORK },
  { term: 'fadebox', as: CLIENT_WORK },
  { term: 'silva[- ]?star', as: CLIENT_WORK },
  { term: 'silvastar', as: CLIENT_WORK },
  { term: 'roa industries', as: CLIENT_WORK },
  { term: '/roa\\b', as: CLIENT_WORK },
  { term: 'toke ?truck', as: CLIENT_WORK },
  { term: 'jd fades', as: CLIENT_WORK },
  { term: 'off-5th', as: CLIENT_WORK },
  { term: 'booksy', as: CLIENT_WORK },
  { term: 'marty', as: CLIENT_WORK },
  { term: 'send-silva-star-proposal', as: CLIENT_SEND },
  // People named in subjects — clients, collaborators, the owner.
  { term: 'kelly', as: 'Client gallery access and invite handling' },
  { term: 'ally', as: CLIENT_WORK },
  { term: 'raquel', as: CLIENT_WORK },
  { term: 'ralphy', as: CLIENT_WORK },
  { term: 'dustin', as: CLIENT_WORK },
  { term: 'mathieu', as: CLIENT_WORK },
  { term: 'e-rod', as: CLIENT_WORK },
  { term: 'daniel', as: CLIENT_WORK },
  { term: 'sean', as: 'Order and email troubleshooting for a customer' },
  { term: "sean's", as: 'Order and email troubleshooting for a customer' },
  { term: 'joshua', as: 'Branded download filenames for gallery photos' },
  { term: 'greene', as: 'Branded download filenames for gallery photos' },
  { term: 'barber', as: CLIENT_WORK },
  { term: 'tattoo', as: CLIENT_WORK },
]

/* Anything email-shaped is stripped from the surviving text. */
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi

/* ------------------------------------------------------------------ *
 * 3. Areas — a single tag per entry, matched top-down.
 * ------------------------------------------------------------------ */
const AREAS = [
  ['Gallery', /gallery|photo|lightbox|drive|exif|watermark|claptrop|print|prodigi|album|map|venue|sync/i],
  ['Booking', /booking|calendar|shoot|slot|appointment/i],
  ['Billing', /invoice|stripe|checkout|payment|payout|price|pricing|promo|deposit|paypal|strike|revenue|refund|credit/i],
  ['Affiliates', /affiliate|commission|king midas|referr/i],
  ['Email', /email|newsletter|zoho|resend|subscrib|unsubscribe|mail|campaign/i],
  ['Shop', /shop|product|fourthwall|merch|cart|order/i],
  ['Blog', /blog|article|archives|book club|column|editorial|post\b/i],
  ['Dashboard', /admin|dashboard|console|widget|crm|leads|analytics|report|registry|clock|weather/i],
  ['Accounts', /auth|login|sign[- ]?in|oauth|google|session|onboard|account|profile|password|magic[- ]?link/i],
  ['Design', /design|noir|border|layout|styl|spacing|mobile|responsive|grid|typograph|colou?r|theme|nav|footer|header|modal/i],
  ['Discovery', /seo|sitemap|meta|indexing|schema|canonical|robots/i],
  ['Platform', /.*/],
]

/* ------------------------------------------------------------------ *
 * Transformation
 * ------------------------------------------------------------------ */
function tidy(subject) {
  let s = subject
    .replace(/\s*\(#\d+\)\s*$/, '')            // trailing PR number
    .replace(PREFIX, '') // feat(admin): … — but "Invoices: …" is kept intact
    .replace(EMAIL, 'our inbox')
    .replace(/&amp;/g, '&')
    .trim()
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function redact(subject) {
  for (const { term, as } of REDACT) {
    if (new RegExp(`(^|[^a-z])${term}([^a-z]|$)`, 'i').test(subject)) return as
  }
  return null
}

function areaOf(text) {
  for (const [name, re] of AREAS) if (re.test(text)) return name
  return 'Platform'
}

function build() {
  const raw = execFileSync(
    'git',
    ['log', '--no-merges', '--date=short', '--format=%ad%x1f%s'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )

  /** @type {Map<string, Map<string, {area: string, text: string}>>} */
  const byDay = new Map()

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [date, subject] = line.split('\x1f')
    if (!subject) continue
    if (DROP.some((re) => re.test(subject))) continue

    const folded = redact(subject)
    const text = folded ?? tidy(subject)
    if (!text || text.length < 6) continue

    if (!byDay.has(date)) byDay.set(date, new Map())
    // Keyed by text so a day never repeats the same line (folded client work
    // collapses many commits into one, and history has genuine duplicates).
    byDay.get(date).set(text.toLowerCase(), { area: areaOf(text), text })
  }

  const days = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, entries]) => ({ date, entries: [...entries.values()] }))

  const totalEntries = days.reduce((n, d) => n + d.entries.length, 0)

  return {
    generatedBy: 'scripts/generate-changelog.mjs',
    firstDate: days[days.length - 1].date,
    lastDate: days[0].date,
    totalEntries,
    totalDays: days.length,
    days,
  }
}

/* ------------------------------------------------------------------ *
 * Assertion — the check must be able to fail.
 * ------------------------------------------------------------------ */
function assertClean(data) {
  const blob = JSON.stringify(data.days)
  const leaks = []
  for (const { term } of REDACT) {
    if (new RegExp(`(^|[^a-z])${term}([^a-z]|$)`, 'i').test(blob)) leaks.push(term)
  }
  const emails = blob.match(EMAIL)
  if (emails) leaks.push(...emails)
  if (leaks.length) {
    console.error('Changelog sanitiser leaked:', [...new Set(leaks)].join(', '))
    process.exit(1)
  }
}

const data = build()
assertClean(data)
const json = JSON.stringify(data, null, 2) + '\n'

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== json) {
    console.error('src/data/changelog.json is stale. Run: npm run changelog')
    process.exit(1)
  }
  console.log(`changelog.json is current — ${data.totalEntries} entries across ${data.totalDays} days.`)
} else {
  writeFileSync(OUT, json)
  console.log(`Wrote ${OUT} — ${data.totalEntries} entries across ${data.totalDays} days (${data.firstDate} → ${data.lastDate}).`)
}
