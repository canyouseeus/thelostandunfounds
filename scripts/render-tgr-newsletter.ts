/**
 * Render the Think and Grow Rich workbook newsletter to a local HTML file for
 * review, using the real branded template rather than a hand-written mock.
 *
 * Preview only — this sends nothing. The send goes through
 * POST /api/newsletter/send, per outreach-ops.
 *
 * Run: npx tsx scripts/render-tgr-newsletter.ts [outfile]
 */

import { writeFileSync } from 'node:fs';
import { generateNewsletterEmail, renderImageButton, EMAIL_STYLES } from '../lib/email-template.js';

// Both links are live. The Audible URL is the owner's own share link, kept
// verbatim including its source_code attribution parameter.
export const AUDIBLE_URL =
  'https://www.audible.com/pd/B0D5P4MXBW?source_code=ASSORAP0511160006&share_location=library_overflow';
export const WORKBOOK_URL =
  'https://www.thelostandunfounds.com/book-club/think-and-grow-rich';

export const SUBJECT = 'A free copy of Think and Grow Rich, and a workbook to go with it';

export const PREHEADER =
  'Audible is running a 30-day free trial. Here is the book, and the workbook we built for it.';

export function buildBody(): string {
  return `
<!--preheader:${PREHEADER}-->
<h1 style="${EMAIL_STYLES.heading1}">READ IT FOR FREE</h1>

<p style="${EMAIL_STYLES.paragraph}">
  Audible is running a <strong>30-day free trial</strong> right now. A trial credit covers
  <em>Think and Grow Rich</em>, which means you can listen to the whole book without paying for it.
  Cancel inside the 30 days and the book is still yours.
</p>

${renderImageButton(AUDIBLE_URL, 'btn-audible-trial', 'START THE FREE TRIAL')}

<h2 style="${EMAIL_STYLES.heading2}">AND A WORKBOOK TO GO WITH IT</h2>

<p style="${EMAIL_STYLES.paragraph}">
  A book like this one is easy to finish and hard to use. So we built a companion workbook:
  all thirteen principles, what each one actually asks of you, and the specific actions to run —
  as checkboxes, with a progress bar and room to write your answers down. Work it while you listen.
</p>

<p style="${EMAIL_STYLES.paragraph}">
  It also tells you where the book doesn't hold up. Hill's chapters on programming your
  subconscious, on thought as a radio signal, and on the sixth sense have no evidence behind them,
  and we say so on the chapter instead of repeating it quietly. The parts that do work — a written
  goal with a number and a date, learning the exact skill your goal needs, deciding fast and
  reversing slow, a small group of people who cover your gaps — are worth the read on their own.
</p>

${renderImageButton(WORKBOOK_URL, 'btn-workbook', 'OPEN THE WORKBOOK')}

<p style="${EMAIL_STYLES.paragraph}">
  No catch, nothing to buy from us. It's a resource. Use it or don't.
</p>

<p style="${EMAIL_STYLES.muted}">
  Trial terms are set by Audible and can change without notice — check the offer on their page
  before you sign up.
</p>
`.trim();
}

// Only write when run directly. Importing this module (the send script does,
// to reuse buildBody) must not drop a file in the working directory.
if (process.argv[1] && process.argv[1].endsWith('render-tgr-newsletter.ts')) {
  const out = process.argv[2] || 'tgr-newsletter-preview.html';
  const html = generateNewsletterEmail(buildBody(), 'preview@thelostandunfounds.com');
  writeFileSync(out, html);
  console.log(`subject: ${SUBJECT}`);
  console.log(`audible: ${AUDIBLE_URL}`);
  console.log(`workbook: ${WORKBOOK_URL}`);
  console.log(`wrote ${out} (${html.length} bytes)`);
}
