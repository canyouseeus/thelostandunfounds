/**
 * One-shot script: send Gabriel the Silva Star Water Solutions sales lead.
 *
 * Run: npx tsx scripts/send-gabriel-silva-star-lead.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { EMAIL_STYLES } from '../lib/email-template';
import { sendTransactionalEmail } from '../lib/api-handlers/_resend-email-handler';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TO_EMAIL = 'Gabriel@onpointusa.net';
const FROM_EMAIL = 'admin@thelostandunfounds.com';
const SUBJECT = 'Sales Lead — Daniel Silva, Silva Star Water Solutions (Austin)';
const PROPOSAL_URL = 'https://www.thelostandunfounds.com/silva-star-proposal.html';

const sectionHeader = `color: #ffffff !important; font-size: 13px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; margin: 32px 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #333333;`;
const bodyText = `color: #ffffff !important; font-size: 15px; line-height: 1.7; margin: 0 0 14px 0;`;
const labelStyle = `color: #ffffff !important; font-size: 15px; font-weight: bold;`;
const valueStyle = `color: #cccccc; font-size: 15px;`;
const bulletItem = `color: #ffffff !important; font-size: 15px; line-height: 1.7; margin: 0 0 12px 0; padding-left: 16px;`;

const bodyContent = `
  <p style="${bodyText}">Hey Gabriel,</p>

  <p style="${bodyText}">I have a warm lead I'd like you to follow up on. Here's everything you need.</p>

  <!-- CONTACT -->
  <h2 style="${sectionHeader}">Contact</h2>
  <p style="${bodyText}">
    <span style="${labelStyle}">Name:</span> <span style="${valueStyle}">Daniel Silva — Silva Star Water Solutions</span><br>
    <span style="${labelStyle}">Phone:</span> <span style="${valueStyle}">512-967-2787</span><br>
    <span style="${labelStyle}">Email:</span> <a href="mailto:danielsilvaatx@gmail.com" style="color: #eeeeee;">danielsilvaatx@gmail.com</a><br>
    <span style="${labelStyle}">Location:</span> <span style="${valueStyle}">Austin, TX</span>
  </p>

  <!-- HIS BUSINESS -->
  <h2 style="${sectionHeader}">His Business</h2>
  <p style="${bodyText}">Grey water disposal for food trucks and events. He also has a subcontractor handling grease work. Currently has zero web presence — no website, no online booking, no digital invoicing.</p>

  <!-- BACKGROUND -->
  <h2 style="${sectionHeader}">Background</h2>
  <p style="${bodyText}">I met Daniel while he was on a job at a food truck. He's running his business with Square but was frustrated with the lack of visibility into payment status. I pitched him on what a full operations platform could do for his business and got his contact info. A proposal and full demo dashboard have been built and are ready to present — your job is to follow up, walk him through what we've built, and close the deal.</p>

  <!-- THE PROPOSAL -->
  <h2 style="${sectionHeader}">The Proposal</h2>
  <div style="margin: 16px 0 24px 0;">
    <a href="${PROPOSAL_URL}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 0.08em;">VIEW PROPOSAL &rarr;</a>
  </div>

  <!-- SELLING POINTS TO HIT -->
  <h2 style="${sectionHeader}">Selling Points to Hit</h2>
  <p style="${bodyText}">The full build is <strong>$2,000</strong> — a $1,000 deposit to start and $1,000 at launch. For context, comparable custom builds from agencies run $15,000&ndash;$40,000+. He's getting a professional landing page, a full admin dashboard, and business tools at a fraction of the market rate.</p>
  <p style="${bodyText}">Here's what to emphasize when you talk to him:</p>

  <p style="${bulletItem}"><strong>Admin dashboard that replaces pen-and-paper operations</strong> — scheduling, job tracking, customer management, invoicing, fleet status, all in one place.</p>

  <p style="${bulletItem}"><strong>AI integration built into the platform</strong> — document generation, automated invoicing, smart scheduling, and client communication tools that save hours every week.</p>

  <p style="${bulletItem}"><strong>Revenue analytics and reporting he can actually understand</strong> — real-time visibility into his business performance, outstanding invoices, job aging, and demand trends.</p>

  <p style="${bulletItem}"><strong>Professional web presence optimized for "grey water disposal Austin TX"</strong> and related searches — he'll start showing up when people search for his services.</p>

  <p style="${bulletItem}"><strong>$300/month retainer</strong> covers hosting, maintenance, and ongoing support. New features scoped from $300 per request.</p>

  <!-- DISCOVERY -->
  <h2 style="${sectionHeader}">Discovery — Questions to Ask</h2>
  <p style="${bodyText}">We need to understand the size of his operation to tailor the pitch and scope properly. Find out:</p>
  <p style="${bulletItem}">How many trucks is he running?</p>
  <p style="${bulletItem}">How many clients is he servicing monthly?</p>
  <p style="${bulletItem}">Is he handling scheduling and dispatch himself or does he have someone managing that?</p>
  <p style="${bulletItem}">What does his current workflow look like day-to-day — is everything manual or is he using any other tools besides Square?</p>

  <!-- IF PRICE IS A BARRIER -->
  <h2 style="${sectionHeader}">If Price Is a Barrier</h2>
  <p style="${bodyText}">If the $2,000 build feels like too much upfront, offer a development partnership option. Instead of a flat fee, we work together on a revenue-sharing or reduced-rate arrangement where he gets the platform at a lower entry point and we grow with his business. Feel this out based on how the conversation goes — if he's interested but hesitant on price, the partnership angle keeps the door open.</p>

  <!-- CRM NOTES -->
  <h2 style="${sectionHeader}">CRM Notes</h2>
  <p style="${bodyText}">
    <span style="${labelStyle}">Lead score:</span> <span style="${valueStyle}">85 (high)</span><br>
    <span style="${labelStyle}">Status:</span> <span style="${valueStyle}">New</span><br>
    <span style="${labelStyle}">Pain point:</span> <span style="${valueStyle}">Visibility into business operations and payments</span><br>
    <span style="${labelStyle}">Proposal status:</span> <span style="${valueStyle}">Sent via email — may still need to review</span>
  </p>
  <p style="${bodyText}">The live demo dashboard is the strongest selling tool — walk him through it on the call.</p>

  <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 30px 0;">

  <p style="${bodyText}">Let me know if you have any questions or need anything else to close this.</p>

  <p style="${bodyText}">Joshua</p>

  <p style="color: #666666; font-size: 13px; line-height: 1.5; margin: 20px 0 0 0;">THE LOST+UNFOUNDS<br>thelostandunfounds.com</p>
`;

async function main() {
  console.log(`[Gabriel Lead Email] Sending to ${TO_EMAIL}...`);
  const result = await sendTransactionalEmail({
    to: TO_EMAIL,
    subject: SUBJECT,
    content: bodyContent,
    from: FROM_EMAIL,
  });

  if (result.success) {
    console.log(`[Gabriel Lead Email] Sent via ${result.provider}. ID: ${result.id || 'n/a'}`);
  } else {
    console.error('[Gabriel Lead Email] Send failed:', result.error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[Gabriel Lead Email] Fatal error:', err);
  process.exit(1);
});
