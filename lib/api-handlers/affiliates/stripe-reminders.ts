import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getUserEmail } from './_connect-account.js';
import { buildOnboardingResumeUrl } from './_onboarding-token.js';
import { sendAffiliateEmail } from './_emails.js';
import { SITE } from '../../../src/config/site'

/**
 * Stripe onboarding reminders.
 *
 * Sweeps every active affiliate who signed up but never finished Stripe
 * Connect onboarding — they cannot be paid until they do — and emails them a
 * one-click resume link.
 *
 * Cadence, per affiliate:
 *   - nothing until GRACE_HOURS after signup (don't nag someone mid-signup)
 *   - then at most one reminder every COOLDOWN_DAYS
 *   - at most MAX_REMINDERS in total, then we stop and leave them alone
 *
 * Sends are recorded in affiliate_email_log with reference_id
 * `stripe_reminder_<n>`, which is also what enforces the cap and the cooldown —
 * so a double-fire of the cron cannot double-send.
 *
 * POST body (all optional):
 *   { testEmail: string }  → render + send one reminder to that address only,
 *                            no logging, no cap. Used to preview the email.
 *   { affiliateId: string }→ restrict the sweep to one affiliate
 *   { force: true }        → ignore grace period and cooldown (still capped)
 *   { dryRun: true }       → report who would be emailed, send nothing
 */

const GRACE_HOURS = 24;
const COOLDOWN_DAYS = 7;
const MAX_REMINDERS = 4;

const SITE_URL = (process.env.SITE_URL || 'https://www.thelostandunfounds.com').replace(/\/$/, '');

interface SweepAffiliate {
  id: string;
  user_id: string;
  code: string | null;
  affiliate_code: string | null;
  first_name: string | null;
  created_at: string;
  stripe_payouts_enabled: boolean | null;
}

/**
 * Addresses that may receive a `testEmail` preview without CRON_SECRET.
 * This is what makes the email previewable from the (ungated) admin router
 * without turning the endpoint into an open relay: an unauthenticated caller
 * can, at most, mail the owner a copy of our own template. Everything that
 * touches a real affiliate still requires the secret.
 */
const OWNER_ADDRESSES = new Set([
  'thelostandunfounds@gmail.com',
  SITE.email.media,
]);

function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers['x-cron-secret'];
  return authHeader === `Bearer ${expected}` || headerSecret === expected || req.query.secret === expected;
}

async function pendingEarnings(supabase: SupabaseClient, affiliateId: string): Promise<number> {
  const { data, error } = await supabase
    .from('affiliate_commissions')
    .select('amount')
    .eq('affiliate_id', affiliateId)
    .in('status', ['pending', 'approved', 'confirmed']);
  if (error) {
    console.warn('[stripe-reminders] balance lookup failed:', affiliateId, error.message);
    return 0;
  }
  return (data || []).reduce((s, c: any) => s + Number(c.amount || 0), 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = (req.method === 'POST' ? req.body : {}) || {};
  const testEmail: string | undefined = typeof body.testEmail === 'string' ? body.testEmail : undefined;

  const isOwnerPreview = !!testEmail && OWNER_ADDRESSES.has(testEmail.trim().toLowerCase());
  if (!isAuthorized(req) && !isOwnerPreview) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // An unauthenticated owner-preview may not choose whose row it renders from:
  // that would let an anonymous caller mint a live onboarding link for any
  // affiliate. Without the secret, the preview is always the recipient's own.
  const onlyAffiliateId: string | undefined =
    isAuthorized(req) && typeof body.affiliateId === 'string' ? body.affiliateId : undefined;
  const force = body.force === true;
  const dryRun = body.dryRun === true;

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseAdmin();
  } catch (err: any) {
    console.error('[stripe-reminders] supabase init failed:', err?.message);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ---- preview mode: render the real template to one address, log nothing ----
  if (testEmail) {
    // Render from the recipient's own affiliate row when they have one. The
    // preview's button is a live link — pointing it at someone else's account
    // would create *their* Stripe account when the previewer clicks it.
    let sample: { id: string; code: string | null; affiliate_code: string | null; first_name: string | null } | null = null;

    if (onlyAffiliateId) {
      const { data } = await supabase
        .from('affiliates')
        .select('id, code, affiliate_code, first_name')
        .eq('id', onlyAffiliateId)
        .maybeSingle();
      sample = data as any;
    } else {
      const { data: all } = await supabase
        .from('affiliates')
        .select('id, user_id, code, affiliate_code, first_name');
      const wanted = testEmail.trim().toLowerCase();
      for (const row of all || []) {
        const email = await getUserEmail(supabase, (row as any).user_id);
        if (email && email.toLowerCase() === wanted) {
          sample = row as any;
          break;
        }
      }
      if (!sample) {
        return res.status(400).json({
          error:
            'No affiliate account matches that address. Pass affiliateId to choose whose row the preview renders from.',
        });
      }
    }

    const affiliateId = sample?.id;
    if (!affiliateId) {
      return res.status(404).json({ error: 'No affiliate available to render a preview from' });
    }

    // Point the preview's button at the deployment serving this request, so a
    // preview sent from a Vercel preview build is actually clickable there
    // rather than aimed at production, where the route may not exist yet.
    const host = req.headers.host as string | undefined;
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https';
    const previewOrigin = host ? `${proto}://${host}` : SITE_URL;

    const result = await sendAffiliateEmail({
      type: 'stripe_reminder',
      affiliateId,
      to: testEmail,
      // no referenceId → no dedup, and we skip the log below by design:
      // sendAffiliateEmail still logs, so mark it as a test in reference_id
      referenceId: `preview_${Date.now()}`,
      data: {
        code: sample?.code || sample?.affiliate_code || '',
        firstName: sample?.first_name || '',
        resumeUrl: buildOnboardingResumeUrl(previewOrigin, affiliateId),
        pendingEarnings: await pendingEarnings(supabase, affiliateId),
      },
    });

    return res.status(result.sent ? 200 : 500).json({
      preview: true,
      resumeOrigin: previewOrigin,
      to: testEmail,
      renderedFrom: affiliateId,
      sent: result.sent,
      error: result.error,
    });
  }

  // ---- real sweep ----
  let query = supabase
    .from('affiliates')
    .select('id, user_id, code, affiliate_code, first_name, created_at, stripe_payouts_enabled')
    .eq('status', 'active')
    .or('is_flagged.is.null,is_flagged.eq.false')
    .or('stripe_payouts_enabled.is.null,stripe_payouts_enabled.eq.false');

  if (onlyAffiliateId) query = query.eq('id', onlyAffiliateId);

  const { data: affiliates, error } = await query;
  if (error) {
    console.error('[stripe-reminders] failed to load affiliates:', error.message);
    return res.status(500).json({ error: error.message });
  }

  const now = Date.now();
  const results: Array<Record<string, any>> = [];
  let sent = 0;
  let skipped = 0;

  for (const aff of (affiliates || []) as SweepAffiliate[]) {
    const note = (reason: string, extra: Record<string, any> = {}) => {
      results.push({ affiliateId: aff.id, code: aff.code, reason, ...extra });
    };

    try {
      // Defensive: the query already filters, but a truthy value here means paid-ready.
      if (aff.stripe_payouts_enabled === true) {
        skipped++;
        note('already onboarded');
        continue;
      }

      const ageHours = (now - new Date(aff.created_at).getTime()) / 36e5;
      if (!force && ageHours < GRACE_HOURS) {
        skipped++;
        note('within grace period', { ageHours: Math.round(ageHours) });
        continue;
      }

      const { data: priorLogs, error: logErr } = await supabase
        .from('affiliate_email_log')
        .select('id, sent_at')
        .eq('affiliate_id', aff.id)
        .eq('email_type', 'stripe_reminder')
        .like('reference_id', 'stripe_reminder_%')
        .order('sent_at', { ascending: false });

      if (logErr) {
        // Failing open here would let a DB blip mail everyone repeatedly.
        skipped++;
        note('log lookup failed — skipping to avoid duplicate sends', { error: logErr.message });
        continue;
      }

      const priorCount = priorLogs?.length || 0;
      if (priorCount >= MAX_REMINDERS) {
        skipped++;
        note('reminder cap reached', { priorCount });
        continue;
      }

      const lastSentAt = priorLogs?.[0]?.sent_at ? new Date(priorLogs[0].sent_at).getTime() : null;
      if (!force && lastSentAt && now - lastSentAt < COOLDOWN_DAYS * 24 * 36e5) {
        skipped++;
        note('within cooldown', { lastSentAt: priorLogs![0].sent_at });
        continue;
      }

      const recipient = await getUserEmail(supabase, aff.user_id);
      if (!recipient) {
        skipped++;
        note('no email on account');
        continue;
      }

      if (dryRun) {
        note('would send', { to: recipient, reminderNumber: priorCount + 1 });
        continue;
      }

      const result = await sendAffiliateEmail({
        type: 'stripe_reminder',
        affiliateId: aff.id,
        referenceId: `stripe_reminder_${priorCount + 1}`,
        to: recipient,
        data: {
          code: aff.code || aff.affiliate_code || '',
          firstName: aff.first_name || '',
          resumeUrl: buildOnboardingResumeUrl(SITE_URL, aff.id),
          pendingEarnings: await pendingEarnings(supabase, aff.id),
        },
      });

      if (result.sent) {
        sent++;
        note('sent', { to: recipient, reminderNumber: priorCount + 1 });
      } else {
        skipped++;
        note(result.skipped ? 'deduped' : 'send failed', { error: result.error });
      }
    } catch (loopErr: any) {
      skipped++;
      note('error', { error: loopErr?.message });
      console.warn('[stripe-reminders] affiliate failed:', aff.id, loopErr?.message);
    }
  }

  return res.status(200).json({
    success: true,
    dryRun,
    candidates: affiliates?.length ?? 0,
    sent,
    skipped,
    results,
  });
}
