/**
 * One-shot script: send the Silva Star Water Solutions proposal email.
 * Recipient is the test address (thelostandunfounds@gmail.com).
 * Content is written as if addressed to Daniel Silva / Silva Star.
 *
 * Uses sendTransactionalEmail (Zoho → Resend fallback).
 *
 * Run: npx tsx scripts/send-silva-star-proposal.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { EMAIL_STYLES } from '../lib/email-template';
import { sendTransactionalEmail } from '../lib/api-handlers/_resend-email-handler';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PROPOSAL_URL = 'https://www.thelostandunfounds.com/silva-star/proposal';
const TO_EMAIL = 'thelostandunfounds@gmail.com';
const SUBJECT = 'YOUR PROPOSAL IS READY | SILVA STAR WATER SOLUTIONS × THE LOST+UNFOUNDS';

const bodyContent = `
  <h1 style="${EMAIL_STYLES.heading1}">YOUR PROPOSAL IS READY</h1>

  <p style="${EMAIL_STYLES.paragraph}">
    Daniel —
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Your custom proposal is live. It covers everything we discussed: the website build, the service dashboard, invoicing with Stripe, the built-in referral program, and the full pricing breakdown — flat-rate fees, no surprises.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Review it at your own pace. All three pages are there: cover, scope, and investment with next steps.
  </p>

  <div style="margin: 40px 0;">
    <a href="${PROPOSAL_URL}" style="${EMAIL_STYLES.button}">VIEW PROPOSAL →</a>
  </div>

  <p style="${EMAIL_STYLES.paragraph}">
    To accept, reply with <strong style="color: #ffffff;">"approved"</strong> and we will send the deposit invoice within the hour. The deposit is $1,000 — balance due on launch day. Site goes live within 3 weeks of deposit clearing.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Questions? Text or call — (512) 967-2787. We will be in touch.
  </p>

  <hr style="${EMAIL_STYLES.divider}">

  <p style="${EMAIL_STYLES.muted}">
    PROPOSAL · SILVA STAR WATER SOLUTIONS<br>
    Prepared by Joshua Greene · THE LOST AND UNFOUNDS LLC.<br>
    Valid through July 31, 2026
  </p>
`;

async function main() {
  console.log(`[Silva Star Proposal] Sending to ${TO_EMAIL}...`);
  const result = await sendTransactionalEmail({
    to: TO_EMAIL,
    subject: SUBJECT,
    content: bodyContent,
  });

  if (result.success) {
    console.log(`[Silva Star Proposal] Sent via ${result.provider}. ID: ${result.id || 'n/a'}`);
  } else {
    console.error('[Silva Star Proposal] Send failed:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Silva Star Proposal] Fatal error:', err);
  process.exit(1);
});
