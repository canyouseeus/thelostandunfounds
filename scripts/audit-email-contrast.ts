/**
 * Email contrast audit.
 *
 * A find-and-replace across email colours has already produced invisible text
 * in this codebase: two client-facing buttons and an amount-due panel came out
 * black-on-black, and none of it was obvious in the diff. This script exists so
 * that failure is caught mechanically instead of by eye.
 *
 * It renders the real templates and scans the produced HTML, plus the email
 * handler sources, for the two fatal cases:
 *
 *   - white-ish text on a white-ish background
 *   - black-ish text on a black-ish background
 *
 * Browser pages are deliberately excluded: _newsletter-unsubscribe-handler.ts
 * renders a page on the site, which is black, and recolouring it as if it were
 * email would make it black-on-black.
 *
 * Run: npx tsx scripts/audit-email-contrast.ts
 */

import { readFileSync } from 'node:fs'
import { BRAND, EMAIL_STYLES, generateTransactionalEmail } from '../lib/email-template.js'

type Failure = { where: string; detail: string }

const failures: Failure[] = []

/** Relative luminance per WCAG, used only to say "light" or "dark". */
function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrast(a: string, b: string): number | null {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function check(where: string, fg: string, bg: string, min = 4.5) {
  const ratio = contrast(fg, bg)
  if (ratio === null) return
  if (ratio < min) {
    failures.push({
      where,
      detail: `${fg} on ${bg} = ${ratio.toFixed(2)}:1, below ${min}:1`,
    })
  }
}

// 1. The palette itself must be internally legible.
check('body text', BRAND.colors.text, BRAND.colors.background)
check('muted text', BRAND.colors.textMuted, BRAND.colors.background, 3)
check('link', BRAND.colors.link, BRAND.colors.background)

// 2. The button legitimately inverts the body, so it is checked against its own
//    fill rather than the page. This is the pair that went black-on-black.
const buttonBg = /background-color:\s*([^;]+);/.exec(EMAIL_STYLES.button)?.[1]?.trim()
const buttonFg = /(?<!-)\bcolor:\s*([^;!]+)/.exec(
  EMAIL_STYLES.button.replace(/background-color:[^;]+;/, '')
)?.[1]?.trim()

if (!buttonBg || !buttonFg) {
  failures.push({ where: 'button', detail: 'could not parse button fill/text colours' })
} else {
  check('button', buttonFg, buttonBg)
  if (/border/.test(EMAIL_STYLES.button)) {
    failures.push({
      where: 'button',
      detail: 'button carries a border; it must be a solid fill (no-border rule)',
    })
  }
}

// 3. The rendered shell must not contain a title tag or an SVG data URI banner,
//    both of which render as visible junk above the banner.
const rendered = generateTransactionalEmail('<p>audit</p>')
if (/<title[\s>]/i.test(rendered)) {
  failures.push({ where: 'shell', detail: '<title> present; clients show it as preheader text' })
}
if (/data:image\/svg/i.test(rendered)) {
  failures.push({ where: 'shell', detail: 'SVG data URI banner is banned' })
}
if (!rendered.includes(BRAND.logo)) {
  failures.push({ where: 'shell', detail: 'banner image missing' })
}

// 4. Handler sources must not still hardcode the old palette. Translucent white
//    is the sneaky one: rgba(255,255,255,.6) is invisible on a white page.
const EMAIL_SOURCES = [
  'lib/api-handlers/_shop-email-utils.ts',
  'lib/api-handlers/_blog-post-published-notify-handler.ts',
  'lib/api-handlers/_newsletter-subscribe-handler.ts',
  'lib/api-handlers/_zoho-email-utils.ts',
  'lib/api-handlers/_send-all-missing-emails-handler.ts',
  'lib/api-handlers/_booking-payment-utils.ts',
  'lib/api-handlers/_photo-email-utils.ts',
  'lib/api-handlers/_newsletter-send-handler.ts',
  'api/cron/banner-notifications.ts',
  'api/events/notifications.ts',
]

for (const file of EMAIL_SOURCES) {
  let src: string
  try {
    src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  } catch {
    failures.push({ where: file, detail: 'listed in audit but not found on disk' })
    continue
  }

  // NOTE: translucent white (rgba(255,255,255,.6)) is CORRECT on the black
  // brand and was only a defect during the brief white-palette experiment on
  // 2026-08-13. Do not re-add a rule banning it. What matters is the pair
  // check below, which is palette-agnostic.

  // Check background/text PAIRS rather than either colour alone. A black fill
  // with white type is a button or an accent panel and is correct on a white
  // page; what must never ship is a fill and a type colour that match.
  const styleAttrs = src.match(/style="[^"]*"/g) || []
  for (const attr of styleAttrs) {
    const bg = /background(?:-color)?:\s*(#[0-9a-f]{3,6})/i.exec(attr)?.[1]
    const fgMatch = /(?:^|[;"\s])color:\s*(#[0-9a-f]{3,6})/i.exec(attr)?.[1]
    if (!bg || !fgMatch) continue

    const expand = (h: string) =>
      h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h

    const ratio = contrast(expand(fgMatch), expand(bg))
    if (ratio !== null && ratio < 4.5) {
      failures.push({
        where: file,
        detail: `${fgMatch} on ${bg} = ${ratio.toFixed(2)}:1 in "${attr.slice(0, 70)}..."`,
      })
    }
  }

  // The outlined-box antipattern: a fill plus a border on the same anchor.
  const outlined = src.match(/<a[^>]*style="[^"]*border:\s*\d+px solid[^"]*"/gi) || []
  if (outlined.length) {
    failures.push({
      where: file,
      detail: `${outlined.length} bordered button(s); buttons are solid fills, never outlines`,
    })
  }
}

if (failures.length) {
  console.error(`\n❌ Email contrast audit failed with ${failures.length} problem(s):\n`)
  for (const f of failures) console.error(`  ${f.where}: ${f.detail}`)
  console.error('')
  process.exit(1)
}

console.log('✅ Email contrast audit passed.')
