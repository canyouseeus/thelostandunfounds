/**
 * Send the Think and Grow Rich campaign as a TEST to one address.
 *
 * contentHtml is wrapped in <body> deliberately. The send handler runs
 * extractBodyContent on it, which falls back to matching the FIRST <table>
 * when no <body> tag is present — and the CTA buttons are tables, so an
 * unwrapped body would be truncated to just the first button.
 *
 * Run: npx tsx scripts/send-tgr-test.ts <email>
 */
import { buildBody, SUBJECT } from './render-tgr-newsletter.js';

const testEmail = process.argv[2];
if (!testEmail) {
  console.error('Refusing to run without an explicit test address.');
  process.exit(1);
}

const body = buildBody();
const payload = {
  subject: SUBJECT,
  content: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  contentHtml: `<body>${body}</body>`,
  testEmail,
};

const res = await fetch('https://www.thelostandunfounds.com/api/newsletter/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log('HTTP', res.status);
console.log(text.slice(0, 1200));
