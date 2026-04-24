/**
 * Send one test email per template type to thelostandunfounds@gmail.com.
 * Run: cd /Users/thelostunfounds/thelostandunfounds && npx tsx .claude/worktrees/sharp-visvesvaraya-51f43b/scripts/send-test-emails-all.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') })

import { generateTransactionalEmail, generateNewsletterEmail } from '../lib/email-template'
import { getZohoAuthContext, sendZohoEmail, delay } from '../lib/api-handlers/_zoho-email-utils'
import { generateContract } from '../api/booking/contract-template'

const TO = 'thelostandunfounds@gmail.com'
const SUPABASE_BANNER = 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png'
const YEAR = new Date().getFullYear()

interface ZohoAuthContext { accessToken: string; accountId: string; fromEmail: string }

async function sendTest(auth: ZohoAuthContext, subject: string, html: string) {
  const result = await sendZohoEmail({ auth, to: TO, subject, htmlContent: html })
  console.log(result.success ? `  ✅  ${subject}` : `  ❌  ${subject} — ${result.error}`)
  await delay(600)
}

// ─── template helpers ──────────────────────────────────────────────────────

const BTN = 'display:inline-block;padding:12px 24px;background-color:#000000;color:#ffffff;border:2px solid #ffffff;text-decoration:none;font-weight:bold;font-size:14px;'

function blogHtml(greeting: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#000;font-family:Arial,sans-serif;">
<table role="presentation" style="width:100%;border-collapse:collapse;background:#000;">
<tr><td align="left" style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;width:100%;border-collapse:collapse;background:#000;">
<tr><td align="left" style="padding:0 0 30px 0;">
  <img src="${SUPABASE_BANNER}" alt="THE LOST+UNFOUNDS" style="max-width:100%;height:auto;display:block;">
</td></tr>
<tr><td style="padding:0;color:#fff;">
  <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">${greeting}</p>
  ${body}
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:30px 0;">
  <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">© ${YEAR} THE LOST+UNFOUNDS. All rights reserved.</p>
  <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:10px 0 0;"><a href="https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(TO)}" style="color:rgba(255,255,255,0.6);text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`
}

function adminShellHtml(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:32px;background:#000;color:#fff;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;">${body}
<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:32px 0;">
<p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0;">Automated notification — THE LOST+UNFOUNDS</p>
</div></body></html>`
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📧  Sending 12 test emails to thelostandunfounds@gmail.com…\n')
  const auth = await getZohoAuthContext()

  // 1. Booking inquiry (admin) — standard template
  await sendTest(auth, '[TEST] New Booking Inquiry — Lifestyle Shoot',
    generateTransactionalEmail(`
      <h1 style="color:#fff;font-size:24px;font-weight:bold;margin:0 0 8px;letter-spacing:.05em;">[TEST] NEW BOOKING INQUIRY</h1>
      <p style="color:#999;font-size:13px;margin:0 0 24px;">Submitted ${new Date().toLocaleString()}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Name</td><td style="color:#fff;font-size:14px;padding:8px 0;">Jane Smith</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Email</td><td style="color:#fff;font-size:14px;padding:8px 0;">jane@example.com</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Shoot Type</td><td style="color:#fff;font-size:14px;padding:8px 0;">Lifestyle Shoot</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Date</td><td style="color:#fff;font-size:14px;padding:8px 0;">Saturday, May 10, 2026</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Location</td><td style="color:#fff;font-size:14px;padding:8px 0;">Downtown Chicago, IL</td></tr>
      </table>
      <p style="color:#666;font-size:12px;margin:32px 0 0;">Booking ID: <code style="color:#888;">test-booking-000</code></p>
    `))

  // 2. Client booking confirmation — standard template
  await sendTest(auth, '[TEST] Your Booking Request Is In — TLAU',
    generateTransactionalEmail(`
      <h1 style="color:#fff;font-size:24px;font-weight:bold;margin:0 0 16px;letter-spacing:.05em;">[TEST] YOUR BOOKING REQUEST IS IN</h1>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Hey Jane — thanks for reaching out. I'll get back to you within 24 hours. Nothing is finalized until the 50% deposit is received.</p>
      <p style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;margin:24px 0 8px;">What you submitted</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;">Shoot Type</td><td style="color:#fff;font-size:14px;padding:8px 0;">Lifestyle Shoot</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;">Date</td><td style="color:#fff;font-size:14px;padding:8px 0;">Saturday, May 10, 2026</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;">Location</td><td style="color:#fff;font-size:14px;padding:8px 0;">Downtown Chicago, IL</td></tr>
      </table>
      <p style="color:#fff;font-size:14px;line-height:1.6;margin:0 0 16px;">A <b>50% non-refundable deposit</b> holds the date. We accept <b>Bitcoin (Strike)</b>, Apple Pay, Cashapp, and Venmo.</p>
      <p style="color:#fff;font-size:14px;margin:32px 0 0;">— Joshua / TLAU</p>
    `))

  // 3. Photo downloads — standard template via generateTransactionalEmail
  await sendTest(auth, '[TEST] Your Photo Marketplace Downloads — THE LOST+UNFOUNDS',
    generateTransactionalEmail(`
      <h1 style="color:#fff;text-transform:uppercase;letter-spacing:-1px;font-size:28px;font-weight:bold;margin:0 0 10px;">[TEST] Your Downloads are Ready</h1>
      <p style="color:#999;font-size:16px;margin:0 0 30px;">Thank you for your purchase. Your high-resolution files are available below.</p>
      <div style="margin-bottom:20px;padding:15px;border:1px solid #333;background:#111;">
        <p style="color:#fff;margin:0 0 10px;font-family:monospace;font-size:12px;">PHOTO ID: test-photo-001</p>
        <a href="https://www.thelostandunfounds.com" style="${BTN}">Download High-Res</a>
      </div>
      <p style="color:#666;font-size:12px;margin:20px 0 0;">Order ID: test-order-000</p>
    `))

  // 4. Admin purchase notification — standard template via generateTransactionalEmail
  await sendTest(auth, '[TEST] New Sale: jane@example.com — THE LOST+UNFOUNDS',
    generateTransactionalEmail(`
      <h1 style="color:#fff;text-transform:uppercase;letter-spacing:-1px;font-size:24px;font-weight:bold;border-bottom:1px solid #333;padding-bottom:20px;margin:0 0 24px;">[TEST] NEW PURCHASE</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Customer</td><td style="color:#fff;font-size:16px;padding:8px 0;">jane@example.com</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;">Order ID</td><td style="color:#fff;font-size:14px;font-family:monospace;padding:8px 0;">test-order-000</td></tr>
        <tr><td style="color:#999;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;white-space:nowrap;vertical-align:top;">Items</td><td style="color:#fff;font-size:14px;padding:8px 0;"><ul style="list-style:none;padding:0;margin:0;"><li style="margin-bottom:6px;font-family:monospace;"><strong>Urban Nights #42</strong> (ID: test-photo-001)</li></ul></td></tr>
      </table>
      <p style="margin:24px 0 0;"><a href="https://www.thelostandunfounds.com/admin" style="color:#999;font-size:11px;text-transform:uppercase;text-decoration:none;letter-spacing:2px;">View Admin Dashboard →</a></p>
    `))

  // 5. Welcome email — custom HTML with Supabase banner (same as welcome handler)
  const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
<table role="presentation" style="width:100%;border-collapse:collapse;background:#000;">
<tr><td align="left" style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;width:100%;border-collapse:collapse;background:#000;margin:0;">
<tr><td align="left" style="padding:0 0 30px 0;"><a href="https://www.thelostandunfounds.com" target="_blank">
  <img src="${SUPABASE_BANNER}" alt="THE LOST+UNFOUNDS" style="max-width:100%;height:auto;display:block;">
</a></td></tr>
<tr><td style="padding:0;color:#fff;">
  <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">[TEST] Hello Jane,</p>
  <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Welcome to THE LOST ARCHIVES BOOK CLUB!</p>
  <ul style="color:#fff;font-size:16px;line-height:1.8;margin:0 0 20px;padding-left:20px;">
    <li>Setting up your account and subdomain</li>
    <li>Writing high-quality articles</li>
    <li>Using AI responsibly</li>
    <li>Earning as an Amazon affiliate</li>
  </ul>
  <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 30px;">
    <tr><td align="left"><a href="https://www.thelostandunfounds.com" style="${BTN}">View Getting Started Guide →</a></td></tr>
  </table>
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:30px 0;">
  <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">© ${YEAR} THE LOST+UNFOUNDS. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`
  await sendTest(auth, '[TEST] Welcome to THE LOST ARCHIVES BOOK CLUB', welcomeHtml)

  // 6. Newsletter — generateNewsletterEmail (standard template)
  await sendTest(auth, '[TEST] Newsletter — Community Update April 2026',
    generateNewsletterEmail(`
      <h2 style="color:#fff;font-size:22px;font-weight:bold;margin:0 0 16px;">[TEST] COMMUNITY UPDATE — APRIL 2026</h2>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">This is a test of the newsletter template. The banner above should appear once.</p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">New this month: gallery, events, and book club updates.</p>
    `, TO))

  // 7. New subscription notification (admin — minimal shell, no Supabase banner in body)
  await sendTest(auth, '[TEST] New PRO subscription',
    adminShellHtml(`
      <h2 style="margin:0 0 16px;font-size:24px;">[TEST] New subscription created</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">A new <strong>PRO</strong> subscription has been created.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tbody>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">User</td><td style="padding:8px 0;color:#fff;">Jane Smith (${TO})</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">Subscription ID</td><td style="padding:8px 0;color:#fff;">sub_test_000</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">Timestamp (UTC)</td><td style="padding:8px 0;color:#fff;">${new Date().toUTCString()}</td></tr>
        </tbody>
      </table>`))

  // 8. Blog submission received
  await sendTest(auth, '[TEST] Article Submission Received — THE LOST ARCHIVES',
    blogHtml('Hello Jane,', `
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Thank you for submitting your article to THE LOST ARCHIVES.</p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;"><strong>[TEST] The Art of Street Photography in 2026</strong></p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Our team will review it shortly.</p>`))

  // 9. Blog submission approved
  await sendTest(auth, '[TEST] Article Approved: The Art of Street Photography in 2026',
    blogHtml('Hello Jane,', `
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Great news! Your article has been approved for publication.</p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;"><strong>[TEST] The Art of Street Photography in 2026</strong></p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Thank you for your contribution!</p>`))

  // 10. Blog submission rejected
  await sendTest(auth, '[TEST] Submission Update — THE LOST ARCHIVES',
    blogHtml('Hello Jane,', `
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">After careful review, we're unable to publish your submission at this time.</p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;"><strong>[TEST] The Art of Street Photography in 2026</strong></p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 10px;"><strong>Reason for rejection:</strong></p>
      <div style="background:rgba(255,255,255,.05);border-left:3px solid rgba(255,255,255,.3);padding:15px;margin:0 0 20px;">
        <p style="color:#fff;font-size:16px;line-height:1.6;margin:0;">Needs more original photography examples and a tighter editorial focus.</p>
      </div>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">We encourage you to revise and resubmit.</p>`))

  // 11. Blog post published (author notification)
  await sendTest(auth, '[TEST] Your Article is Live — THE LOST ARCHIVES',
    blogHtml('Hello Jane,', `
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">Your article is live on THE LOST ARCHIVES!</p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;"><strong>[TEST] The Art of Street Photography in 2026</strong></p>
      <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 20px;">This is your 3rd published article. Keep it up!</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 30px;">
        <tr><td align="left"><a href="https://www.thelostandunfounds.com/blog/test" style="${BTN}">Read Your Article →</a></td></tr>
      </table>`))

  // 12. Photography contract — brand banner + white card, via sendZohoEmail
  await sendTest(auth, '[TEST] Photography Services Agreement — THE LOST+UNFOUNDS',
    generateContract({
      clientName: 'Jane Smith (TEST)',
      clientEmail: TO,
      eventDate: 'Saturday, May 10, 2026',
      locations: [{ name: 'Millennium Park', address: 'Chicago, IL', peakHours: '10am–12pm' }],
      totalPrice: 800,
      deliverablesPerLocation: '20 edited photos + 1 reel',
      notes: 'This is a test contract email — no real agreement.',
    }))

  console.log('\nDone. Check thelostandunfounds@gmail.com for all 12 test emails.\n')
}

main().catch(err => { console.error(err); process.exit(1) })
