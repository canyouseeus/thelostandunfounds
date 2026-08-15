import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from './_shared.js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES } from '../../email-template.js';

/**
 * The "you're on the roster: here's what's still missing for *you*" email.
 *
 * The invite email gets somebody onto the roster and asks for their kit list.
 * This is the one that comes after, and the thing that makes it work is that
 * it is not the same email for everybody. Being on the roster is not the same
 * as being able to work: without a login you can't see a job or block a date,
 * without a kit list you don't come up when we search for who to send, and
 * without Stripe you can be assigned and accrued but never actually paid.
 *
 * A generic "go set everything up" email asks each person to work out for
 * themselves which of those they've already done; which is exactly the effort
 * that made them stall the first time. So each send is assembled from that
 * person's real state: what's done is acknowledged in one line, and the body is
 * only the steps they still owe, in the order that unblocks the most.
 *
 * The ordering is not cosmetic. Login gates the dashboard, and the dashboard is
 * where Stripe and the calendar live, so somebody with no account gets exactly
 * one ask, and the rest is described rather than demanded. Handing a person
 * four buttons when three of them lead to a login wall is how you get zero.
 *
 * POST body (all optional):
 *   { testEmail }  → send one copy per distinct variant to that address and
 *                    stop. Owner addresses only without CRON_SECRET, so the
 *                    ungated admin router can't be turned into a relay.
 *   { emails: [] } → restrict the send to these roster addresses
 *   { dryRun }     → report who would get what, send nothing
 *
 * There is no send log and no cooldown: this is a one-off announcement, not a
 * recurring sweep, so running it twice mails everyone twice. That is also why
 * it is deliberately not wired to a cron.
 */

const SITE = (process.env.SITE_URL || 'https://www.thelostandunfounds.com').replace(/\/$/, '');

// media@ is the business address of record for photographer coordination.
const BUSINESS_RECORD_CC = 'media@thelostandunfounds.com';

// This one goes out over Joshua's name, not the platform's. It asks people for
// things (their kit, their bank details, their availability) and those asks
// land differently from a person than from noreply@. Both providers honour a
// caller-supplied sender, so this is read on the Zoho path and the Resend
// fallback alike.
const FROM_ADDRESS = process.env.CREW_FROM_EMAIL || 'joshua@thelostandunfounds.com';

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

export interface Recipient {
  name: string;
  email: string;
  hasLogin: boolean;
  gearItems: number;
  hasStripe: boolean;
  galleries: number;
  blockedDays: number;
}

/** One outstanding step, rendered as its own section. */
interface Step {
  key: string;
  heading: string;
  body: string;
}

/**
 * Assemble one person's email out of what they have and haven't done.
 *
 * Returns the variant key alongside the copy so a dry run can report who is
 * getting which shape without rendering five HTML documents into a console.
 */
export function buildOnboardingEmail(person: Recipient): {
  subject: string;
  content: string;
  variant: string;
  missing: string[];
} {
  const firstName = escapeHtml(person.name.trim().split(/\s+/)[0] || 'there');
  const dashboard = `${SITE}/photographer-dashboard`;

  const hasGear = person.gearItems > 0;
  const missing: string[] = [];
  if (!person.hasLogin) missing.push('login');
  if (!hasGear) missing.push('gear');
  if (!person.hasStripe) missing.push('stripe');

  // ── What they've already done ───────────────────────────────────────
  // Named specifically, because "thanks for getting set up" to someone who
  // did one of three things reads as though nobody looked.
  const done: string[] = [];
  if (hasGear) {
    done.push(
      `your gear list (<strong>${person.gearItems} ${person.gearItems === 1 ? 'item' : 'items'}</strong> on file)`
    );
  }
  if (person.hasStripe) done.push('Stripe connected, so you can actually be paid');
  if (person.galleries > 0) {
    done.push(`${person.galleries} ${person.galleries === 1 ? 'gallery' : 'galleries'} up`);
  }
  if (person.blockedDays > 0) done.push('dates blocked out on your calendar');

  const doneBlock = done.length
    ? `<p style="${EMAIL_STYLES.paragraph}">
         You've already got ${done.length === 1 ? done[0] : `${done.slice(0, -1).join(', ')} and ${done[done.length - 1]}`}
         thank you, that's the part most people never get round to.
       </p>`
    : '';

  // ── Steps, in the order that unblocks the most ──────────────────────
  const steps: Step[] = [];

  if (!person.hasLogin) {
    // The one and only ask for somebody with no account. Everything else
    // lives behind this door, so listing the rest as tasks would just be
    // four buttons that all land on a login screen.
    steps.push({
      key: 'login',
      heading: 'STEP ONE: SIGN IN',
      body: `
        <p style="${EMAIL_STYLES.paragraph}">
          You don't have a login yet, and it's the only thing standing between you and everything
          below. <strong>Sign in with this exact email address</strong>; that's what connects the
          account to your spot on the roster. Use a different address and you'll land on an empty
          dashboard while all your work sits somewhere you can't see it.
        </p>
        <p style="${EMAIL_STYLES.paragraph}">${button(dashboard, 'SIGN IN & OPEN YOUR DASHBOARD')}</p>
        <p style="${EMAIL_STYLES.paragraph}">
          Once you're in, everything below takes about five minutes total.
        </p>`,
    });
  }

  if (!hasGear) {
    steps.push({
      key: 'gear',
      heading: person.hasLogin ? 'ADD YOUR GEAR' : 'THEN: ADD YOUR GEAR',
      body: `
        <p style="${EMAIL_STYLES.paragraph}">
          <strong>We don't have a kit list for you.</strong> This is the one thing we need back, and
          it's the difference between getting called and not: we search the gear list to decide who
          to send. A rooftop job goes to whoever has the drone, a talking-head to whoever has the
          lav. An empty list means you don't come up in that search at all.
        </p>
        <p style="${EMAIL_STYLES.paragraph}">${button(`${SITE}/gear`, 'ADD YOUR GEAR')}</p>`,
    });
  }

  if (!person.hasStripe) {
    steps.push({
      key: 'stripe',
      heading: person.hasLogin ? 'CONNECT STRIPE' : 'THEN: CONNECT STRIPE',
      body: `
        <p style="${EMAIL_STYLES.paragraph}">
          <strong>You haven't connected Stripe.</strong> This is the one that costs you money if
          you leave it: we can book you, you can shoot the job, and the pay will sit there marked
          owed with nowhere to send it. It's a few minutes on Stripe's own onboarding, from the
          button on your dashboard.
        </p>
        <p style="${EMAIL_STYLES.paragraph}">
          Same account covers both kinds of money; job pay for shoots we send you on, and your
          gallery sales. You only do it once.
        </p>
        <p style="${EMAIL_STYLES.paragraph}">${button(dashboard, 'CONNECT STRIPE')}</p>`,
    });
  }

  // ── Things worth knowing, whatever their state ──────────────────────
  const calendarBlock = `
    <h2 style="${EMAIL_STYLES.heading2}">BLOCK OUT YOUR DATES</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      This is brand new, and it's the reason for this email. Your dashboard now has a calendar;
      tap any day to mark yourself unavailable, tap it again to free it up. It feeds straight into
      the studio's master calendar, so we can see who's actually free before we start calling. No
      text needed${person.hasLogin ? '' : ' once you\'re signed in'}.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Blocking a day only blocks <em>you</em>. It doesn't close the date for anyone else on the
      roster and it doesn't stop the studio taking the work; it just means we don't call you about it.
    </p>`;

  const galleryBlock = `
    <h2 style="${EMAIL_STYLES.heading2}">${person.galleries > 0 ? 'YOUR GALLERIES' : 'SELL YOUR PHOTOS'}</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      ${
        person.galleries > 0
          ? `You've got ${person.galleries} up already; keep going. `
          : 'You can post galleries and sell prints and digitals through the platform. '
      }
      <strong>You keep 100% of your gallery sales.</strong> We take nothing off the top; you just
      pay Stripe's processing fee, same as you would anywhere. That's separate from job pay:
      shoots we send you on are the usual 80/20 split, and both land on the same dashboard.
    </p>`;

  const askBlock = `
    <h2 style="${EMAIL_STYLES.heading2}">ASK FOR ANYTHING</h2>
    <p style="${EMAIL_STYLES.paragraph}">
      There's a box at the bottom of your dashboard. Type a question, something that's broken, or a
      feature you want built, and send it; it comes straight to us and the reply shows up in the
      same place. You don't need to know whether something is possible. Ask, and we'll tell you;
      if enough of you want the same thing, we'll build it.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Genuinely: go poke around and tell us what's missing. That's the fastest way this gets
      better for all of you.
    </p>`;

  // ── Opening line, which is where the personalisation has to land ────
  let opener: string;
  let subject: string;

  if (!missing.length) {
    opener = `
      <p style="${EMAIL_STYLES.paragraph}">
        Hey ${firstName}: thank you again for signing up. You're one of the few who is completely
        set up: login, gear list and Stripe all done. Nothing to chase you for, so this is just the
        new stuff.
      </p>`;
    subject = `${firstName}, you're all set, and your dashboard just got a calendar`;
  } else if (missing.length === 3) {
    opener = `
      <p style="${EMAIL_STYLES.paragraph}">
        Hey ${firstName}: thank you again for signing up. You're on the roster, but nothing's
        switched on yet, so right now we can't call you for work and couldn't pay you if we did.
        Here's exactly what's left, shortest path first.
      </p>`;
    subject = `${firstName}, let's get you switched on`;
  } else {
    const label = missing
      .map((m) => (m === 'login' ? 'a login' : m === 'gear' ? 'your gear list' : 'Stripe'))
      .join(' and ');
    const one = missing.length === 1;
    opener = `
      <p style="${EMAIL_STYLES.paragraph}">
        Hey ${firstName}: thank you again for signing up. You're nearly there:
        ${one ? 'the only thing still missing is' : "there are two things left; "} ${label}.
        Here's what that takes.
      </p>`;
    subject = one
      ? `${firstName}, you're one step from done`
      : `${firstName}, two things left to get you working`;
  }

  const stepsBlock = steps
    .map((step) => `<h2 style="${EMAIL_STYLES.heading2}">${step.heading}</h2>${step.body}`)
    .join('\n');

  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">YOU'RE ON THE ROSTER</h1>

    ${opener}
    ${doneBlock}
    ${stepsBlock}
    ${calendarBlock}
    ${missing.length ? '' : `<p style="${EMAIL_STYLES.paragraph}">${button(dashboard, 'OPEN YOUR DASHBOARD')}</p>`}
    ${galleryBlock}
    ${askBlock}

    <p style="${EMAIL_STYLES.paragraph}">; Joshua / THE LOST+UNFOUNDS</p>

    <hr style="${EMAIL_STYLES.divider}" />

    <p style="${EMAIL_STYLES.muted}">
      This one comes straight from me; reply to it and it lands in my inbox. Anything about a
      shoot, a payment or a date can go here or in the box on the dashboard, whichever is quicker
      for you.
    </p>
  `;

  return {
    subject,
    content,
    variant: missing.length ? `missing:${missing.join('+')}` : 'complete',
    missing,
  };
}

/** Everyone on the active roster, with the real state each email is built from. */
async function loadRoster(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<Recipient[]> {
  const { data: people, error } = await supabase
    .from('photographers')
    .select('id, name, email, user_id, stripe_account_id')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;

  // The house account is a roster row so invoices can name it as the
  // contractor. It is not a person to onboard.
  const roster = (people || []).filter((p) => !OWNER_ADDRESSES.has(String(p.email).toLowerCase()));
  const userIds = roster.map((p) => p.user_id).filter(Boolean) as string[];

  const [{ data: gear }, affiliatesRes, librariesRes, { data: availability }] = await Promise.all([
    supabase.from('photographer_gear').select('photographer_id'),
    userIds.length
      ? supabase.from('affiliates').select('user_id, stripe_account_id').in('user_id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? supabase.from('photo_libraries').select('user_id, owner_id')
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('photographer_availability').select('photographer_id').eq('is_blocked', true),
  ]);

  const count = (rows: any[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const row of rows || []) {
      const id = row[key];
      if (id) m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  };

  const gearCount = count(gear, 'photographer_id');
  const blockedCount = count(availability, 'photographer_id');

  // Stripe counts either way round: most of the crew onboarded as affiliates
  // first, and resolveConnectAccount reuses that account for job pay.
  const affiliateStripe = new Set(
    (affiliatesRes.data || []).filter((a: any) => a.stripe_account_id).map((a: any) => a.user_id)
  );

  const galleryCount = new Map<string, number>();
  for (const lib of librariesRes.data || []) {
    for (const id of [(lib as any).user_id, (lib as any).owner_id]) {
      if (id) galleryCount.set(id, (galleryCount.get(id) || 0) + 1);
    }
  }

  return roster.map((p) => ({
    name: p.name,
    email: p.email,
    hasLogin: Boolean(p.user_id),
    gearItems: gearCount.get(p.id) || 0,
    hasStripe: Boolean(p.stripe_account_id || (p.user_id && affiliateStripe.has(p.user_id))),
    galleries: p.user_id ? galleryCount.get(p.user_id) || 0 : 0,
    blockedDays: blockedCount.get(p.id) || 0,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = (req.body || {}) as { testEmail?: string; emails?: string[]; dryRun?: boolean };

  const testEmail = typeof body.testEmail === 'string' ? body.testEmail.trim() : '';
  const isOwnerPreview = !!testEmail && OWNER_ADDRESSES.has(testEmail.toLowerCase());
  if (!isAuthorized(req) && !isOwnerPreview) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const roster = await loadRoster(getSupabaseAdmin());

    // ── Preview: one copy of each distinct variant, to the owner ───────
    // Sending only the first person's copy would hide exactly what this
    // endpoint exists to get right: that the emails differ per person.
    if (testEmail) {
      const seen = new Set<string>();
      const samples = roster.filter((person) => {
        const { variant } = buildOnboardingEmail(person);
        if (seen.has(variant)) return false;
        seen.add(variant);
        return true;
      });

      const sent = [];
      for (const person of samples) {
        const email = buildOnboardingEmail(person);
        const result = await sendTransactionalEmail({
          to: testEmail,
          cc: BUSINESS_RECORD_CC,
          from: FROM_ADDRESS,
          subject: `[TEST: ${person.name}] ${email.subject}`,
          content: email.content,
        });
        sent.push({
          renderedFor: person.name,
          variant: email.variant,
          missing: email.missing,
          success: result.success,
          provider: result.provider,
          error: result.error,
        });
        await new Promise((resolve) => setTimeout(resolve, 750));
      }

      return res.status(200).json({ mode: 'test', sentTo: testEmail, variants: sent });
    }

    const only = Array.isArray(body.emails)
      ? new Set(body.emails.map((e) => String(e).toLowerCase().trim()))
      : null;
    const targets = only ? roster.filter((p) => only.has(p.email.toLowerCase())) : roster;

    if (body.dryRun) {
      return res.status(200).json({
        mode: 'dryRun',
        wouldSend: targets.length,
        recipients: targets.map((person) => {
          const email = buildOnboardingEmail(person);
          return {
            name: person.name,
            email: person.email,
            subject: email.subject,
            missing: email.missing,
            has: {
              login: person.hasLogin,
              gearItems: person.gearItems,
              stripe: person.hasStripe,
              galleries: person.galleries,
              blockedDays: person.blockedDays,
            },
          };
        }),
      });
    }

    const results: Array<{ email: string; variant: string; success: boolean; provider?: string; error?: string }> = [];
    for (const person of targets) {
      const email = buildOnboardingEmail(person);
      try {
        const result = await sendTransactionalEmail({
          to: person.email,
          cc: BUSINESS_RECORD_CC,
          from: FROM_ADDRESS,
          subject: email.subject,
          content: email.content,
        });
        results.push({
          email: person.email,
          variant: email.variant,
          success: result.success,
          provider: result.provider,
          error: result.error,
        });
      } catch (err: any) {
        results.push({
          email: person.email,
          variant: email.variant,
          success: false,
          error: err?.message || 'send failed',
        });
      }
      // Zoho rate-limits hard, and then takes the token refresh down with it.
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
