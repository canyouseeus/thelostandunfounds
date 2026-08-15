import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_shared.js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES } from '../../email-template.js';

/**
 * The "you're on the roster — here's what you can actually do" email.
 *
 * The invite email gets somebody onto the roster and asks for their kit list.
 * This is the one that comes after: the platform has grown a calendar, gallery
 * sales and an ask-box since most of the crew signed up, and none of them know
 * any of it exists. Everything it points at is something they can do in a
 * browser in the next five minutes.
 *
 * Two shapes, chosen per recipient rather than by the sender:
 *
 *  - **Has an account** → straight to the dashboard.
 *  - **No account yet** → sign in first, and specifically with the address this
 *    email arrived at. The roster row links to whichever account signs in with
 *    a matching verified address, so getting that wrong is what strands someone
 *    with an empty dashboard next to a roster row full of their work.
 *
 * POST body (all optional):
 *   { testEmail }  → send one copy to that address and stop. Owner addresses
 *                    only without CRON_SECRET, so the ungated admin router
 *                    can't be turned into a relay.
 *   { emails: [] } → restrict the send to these roster addresses
 *   { dryRun }     → report who would be emailed, send nothing
 *
 * Sends are recorded in `crew_requests`-adjacent terms nowhere: this is a
 * one-off announcement, not a recurring sweep, so there is no log table and no
 * cooldown. Running it twice mails everyone twice — which is why it is
 * deliberately not on a cron.
 */

const SITE = (process.env.SITE_URL || 'https://www.thelostandunfounds.com').replace(/\/$/, '');

// media@ is the business address of record for photographer coordination.
const BUSINESS_RECORD_CC = 'media@thelostandunfounds.com';

const OWNER_ADDRESSES = new Set([
  'thelostandunfounds@gmail.com',
  'media@thelostandunfounds.com',
  'admin@thelostandunfounds.com',
]);

function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers['x-cron-secret'];
  return (
    authHeader === `Bearer ${expected}` ||
    headerSecret === expected ||
    req.query.secret === expected
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="${EMAIL_STYLES.button}">${label}</a>`;

interface Recipient {
  name: string;
  email: string;
  hasAccount: boolean;
  gearItems: number;
}

export function buildOnboardingEmail(person: Recipient): { subject: string; content: string } {
  const firstName = escapeHtml(person.name.trim().split(/\s+/)[0] || 'there');
  const dashboard = `${SITE}/photographer-dashboard`;

  // The kit list is the one thing we ask *back* from them, so whether it is
  // already done changes the paragraph rather than just the link.
  const gearBlock = person.gearItems
    ? `
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>Your gear list is already on file</strong> — ${person.gearItems}
      ${person.gearItems === 1 ? 'item' : 'items'}. If you've bought or sold anything since,
      update it at <a href="${SITE}/gear" style="${EMAIL_STYLES.link}">${SITE.replace('https://', '')}/gear</a>.
      We search that list to work out who to send on a job, so a body or a lens missing from it
      is work you don't get offered.
    </p>`
    : `
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>Finish your gear loadout.</strong> This is the one thing we need back from you, and
      it takes about two minutes. We search the kit list to decide who to send — a rooftop job goes
      to whoever has the drone, a talking-head to whoever has the lav. An empty list means you
      don't come up.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">${button(`${SITE}/gear`, 'ADD YOUR GEAR')}</p>`;

  const accessBlock = person.hasAccount
    ? `
    <p style="${EMAIL_STYLES.paragraph}">${button(dashboard, 'OPEN YOUR DASHBOARD')}</p>`
    : `
    <p style="${EMAIL_STYLES.paragraph}">
      You don't have a login yet. Sign in on the site — <strong>use this exact email address</strong>,
      because that's what connects the account to your spot on the roster. Sign in with a different
      address and you'll land on an empty dashboard with all your work sitting somewhere you can't
      see it.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">${button(dashboard, 'SIGN IN & OPEN YOUR DASHBOARD')}</p>`;

  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">YOU'RE ON THE ROSTER</h1>

    <p style="${EMAIL_STYLES.paragraph}">
      Hey ${firstName} — thank you again for signing up. This is the catch-up email: the platform
      has grown a few things since you joined, and all of them are yours to use.
    </p>

    <h2 style="${EMAIL_STYLES.heading2}">BLOCK OUT YOUR DATES</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      This is the new one. Your dashboard now has a calendar. Tap any day to mark yourself
      unavailable, tap it again to free it up, and that's it — it feeds straight into the studio's
      master calendar, so we can see who's actually free before we call anyone. No text needed.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Blocking a day only blocks <em>you</em>. It doesn't close the date for anyone else on the
      roster, and it doesn't stop the studio taking the work.
    </p>

    ${accessBlock}

    <h2 style="${EMAIL_STYLES.heading2}">GEAR LOADOUT</h2>
    ${gearBlock}

    <h2 style="${EMAIL_STYLES.heading2}">SELL YOUR PHOTOS</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      You can post galleries and sell prints and digitals through the platform, and
      <strong>you keep 100% of your gallery sales</strong> — we take nothing off the top, you just
      pay Stripe's processing fee like anyone would. That's separate from job pay: shoots we send
      you on are the usual 80/20 split, and both show up on the same dashboard.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Connect Stripe from the dashboard if you haven't. Nothing can be paid out to you until that's
      done, and it's the same account for job pay and gallery sales — you only do it once.
    </p>

    <h2 style="${EMAIL_STYLES.heading2}">ASK FOR ANYTHING</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      There's a box at the bottom of your dashboard. Type a question, something that's broken, or a
      feature you want built, and hit send — it comes straight to us and the reply shows up in the
      same place. You don't have to know whether something is possible. Ask for it and we'll tell
      you, and if enough people want the same thing we'll build it.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Genuinely: go poke around the dashboard and tell us what's missing. That's the fastest way
      this gets better for all of you.
    </p>

    <hr style="${EMAIL_STYLES.divider}" />

    <p style="${EMAIL_STYLES.muted}">
      Reply to this email and it reaches a person. Anything about a shoot, a payment or a date can
      go here or in the box on the dashboard — whichever is quicker for you.
    </p>
  `;

  return { subject: `${firstName}, your photographer dashboard just got a calendar`, content };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body || {}) as {
    testEmail?: string;
    emails?: string[];
    dryRun?: boolean;
  };

  const testEmail = typeof body.testEmail === 'string' ? body.testEmail.trim() : '';
  const isOwnerPreview = !!testEmail && OWNER_ADDRESSES.has(testEmail.toLowerCase());
  if (!isAuthorized(req) && !isOwnerPreview) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: people, error } = await supabase
      .from('photographers')
      .select('id, name, email, active, user_id')
      .eq('active', true)
      .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const { data: gear } = await supabase.from('photographer_gear').select('photographer_id');
    const gearCount = new Map<string, number>();
    for (const item of gear || []) {
      gearCount.set(item.photographer_id, (gearCount.get(item.photographer_id) || 0) + 1);
    }

    // The house account is a roster row so invoices can name it as the
    // contractor. It is not a person to onboard.
    const roster: Recipient[] = (people || [])
      .filter((p) => !OWNER_ADDRESSES.has(String(p.email).toLowerCase()))
      .map((p) => ({
        name: p.name,
        email: p.email,
        hasAccount: Boolean(p.user_id),
        gearItems: gearCount.get(p.id) || 0,
      }));

    // ── Preview: render a real roster member's copy to the owner ────────
    if (testEmail) {
      const sample = roster[0] || {
        name: 'Sample Photographer',
        email: testEmail,
        hasAccount: false,
        gearItems: 0,
      };
      const email = buildOnboardingEmail(sample);
      const result = await sendTransactionalEmail({
        to: testEmail,
        cc: BUSINESS_RECORD_CC,
        subject: `[TEST] ${email.subject}`,
        content: email.content,
      });
      return res.status(result.success ? 200 : 502).json({
        mode: 'test',
        renderedFor: sample.name,
        sentTo: testEmail,
        cc: BUSINESS_RECORD_CC,
        success: result.success,
        provider: result.provider,
        error: result.error,
      });
    }

    const only = Array.isArray(body.emails)
      ? new Set(body.emails.map((e) => String(e).toLowerCase().trim()))
      : null;
    const targets = only ? roster.filter((p) => only.has(p.email.toLowerCase())) : roster;

    if (body.dryRun) {
      return res.status(200).json({
        mode: 'dryRun',
        wouldSend: targets.length,
        recipients: targets.map((p) => ({
          name: p.name,
          email: p.email,
          hasAccount: p.hasAccount,
          gearItems: p.gearItems,
        })),
      });
    }

    const results: Array<{ email: string; success: boolean; provider?: string; error?: string }> = [];
    for (const person of targets) {
      const email = buildOnboardingEmail(person);
      try {
        const result = await sendTransactionalEmail({
          to: person.email,
          cc: BUSINESS_RECORD_CC,
          subject: email.subject,
          content: email.content,
        });
        results.push({
          email: person.email,
          success: result.success,
          provider: result.provider,
          error: result.error,
        });
      } catch (err: any) {
        results.push({ email: person.email, success: false, error: err?.message || 'send failed' });
      }
      // Zoho rate-limits hard and then takes the token refresh down with it.
      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    return res.status(200).json({
      mode: 'send',
      attempted: results.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success),
      results,
    });
  } catch (err: any) {
    console.error('[crew/onboarding-email]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
