import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from './_stripe-client.js';
import { sendAffiliateEmail } from './_emails.js';
import { isCronAuthorized } from '../crew/_shared.js';

/**
 * Pay approved affiliate commissions to their Stripe Connect accounts.
 *
 * The affiliate counterpart of crew/send-payouts.ts, and on the same hourly
 * schedule. Affiliate money used to move only when someone pressed "request
 * payout", so a commission could sit owed indefinitely after the client had
 * paid. Now it goes out on the first run after it can.
 *
 * Guards between a commission and a transfer:
 *  1. Status `approved`/`confirmed`, unpaid, and past `available_date` (null
 *     means no hold — what a manual commission gets).
 *  2. The affiliate is active, not flagged, and has a Connect account with
 *     payouts enabled. Anyone who hasn't finished onboarding keeps accruing and
 *     is paid the run after they finish.
 *  3. The platform's *available* balance covers it. Client card payments sit
 *     in "pending" for ~2 business days; an early run is a silent no-op, never
 *     a failed payout or an email blaming the affiliate.
 *  4. At least MIN_PAYOUT owed, matching request-payout.
 *
 * A transfer that Stripe still rejects marks those commissions `failed`, so the
 * next hour doesn't retry and fail again; the reason is kept on the
 * payout_requests row for the owner. The affiliate is not emailed about it —
 * Stripe's errors describe the platform's account as often as theirs.
 */

const MIN_PAYOUT = 10;

const toMoney = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

interface CommissionRow {
  id: string;
  affiliate_id: string;
  amount: number | string;
}

interface AffiliateRow {
  id: string;
  user_id: string | null;
  code: string | null;
  affiliate_code: string | null;
  status: string | null;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean | null;
  is_flagged: boolean | null;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function runAffiliatePayouts(options: { dryRun?: boolean } = {}) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from('affiliate_commissions')
    .select('id, affiliate_id, amount')
    .in('status', ['approved', 'confirmed'])
    .is('paid_at', null)
    .or(`available_date.is.null,available_date.lte.${now}`)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  if (!due?.length) return { checked: 0, paid: 0, skipped: 0, failed: 0, results };

  const byAffiliate = new Map<string, CommissionRow[]>();
  for (const c of due as CommissionRow[]) {
    const list = byAffiliate.get(c.affiliate_id) || [];
    list.push(c);
    byAffiliate.set(c.affiliate_id, list);
  }

  const { data: affiliates, error: affErr } = await supabase
    .from('affiliates')
    .select('id, user_id, code, affiliate_code, status, stripe_account_id, stripe_payouts_enabled, is_flagged')
    .in('id', [...byAffiliate.keys()]);
  if (affErr) throw affErr;

  const stripe = getStripe();
  const balance = await stripe.balance.retrieve();
  let availableCents = (balance.available || [])
    .filter(b => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0);

  let paid = 0;
  let skipped = 0;
  let failed = 0;

  for (const affiliate of (affiliates || []) as AffiliateRow[]) {
    const commissions = byAffiliate.get(affiliate.id) || [];
    const amount = toMoney(commissions.reduce((s, c) => s + Number(c.amount || 0), 0));
    const amountCents = Math.round(amount * 100);
    const code = affiliate.code || affiliate.affiliate_code || 'UNKNOWN';
    const base = { affiliate: code, amount, commissions: commissions.length };

    const skip = (reason: string) => {
      skipped++;
      results.push({ ...base, skipped: reason });
    };
    if (affiliate.status && affiliate.status !== 'active') { skip('inactive'); continue; }
    if (affiliate.is_flagged) { skip('flagged'); continue; }
    if (!affiliate.stripe_account_id) { skip('no_connected_account'); continue; }
    if (!affiliate.stripe_payouts_enabled) { skip('payouts_not_enabled'); continue; }
    if (amount < MIN_PAYOUT) { skip('below_minimum'); continue; }
    // Funds have not settled yet. Leave everything as is — the next run retries.
    if (amountCents > availableCents) { skip('insufficient_platform_balance'); continue; }

    if (options.dryRun) {
      results.push({ ...base, wouldPay: affiliate.stripe_account_id });
      availableCents -= amountCents;
      continue;
    }

    const commissionIds = commissions.map(c => c.id).sort();
    // Keyed on the exact set of commissions, so a retried or overlapping run
    // can never pay the same commissions twice.
    const idempotencyKey =
      'affiliate_payout_' + createHash('sha256').update(commissionIds.join(',')).digest('hex').slice(0, 40);

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: 'usd',
          destination: affiliate.stripe_account_id,
          description: `Affiliate commission payout — ${code}`,
          metadata: { affiliate_id: affiliate.id, affiliate_code: code, kind: 'affiliate_auto_payout' },
        },
        { idempotencyKey }
      );

      const paidAt = new Date().toISOString();
      await supabase
        .from('affiliate_commissions')
        .update({ status: 'paid', paid_at: paidAt, stripe_transfer_id: transfer.id })
        .in('id', commissionIds);
      await supabase.from('payout_requests').insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: code,
        amount,
        stripe_account_id: affiliate.stripe_account_id,
        stripe_transfer_id: transfer.id,
        payout_method: 'stripe',
        status: 'paid',
        paid_at: paidAt,
        notes: 'Automatic payout',
      });

      availableCents -= amountCents;
      paid++;

      // Best-effort: the money has moved and the rows say so either way.
      let notified = false;
      try {
        if (affiliate.user_id) {
          const { data: userRow } = await supabase.auth.admin.getUserById(affiliate.user_id);
          const to = userRow?.user?.email;
          if (to) {
            const sent = await sendAffiliateEmail({
              type: 'payout_sent',
              affiliateId: affiliate.id,
              referenceId: transfer.id,
              to,
              data: { amount, transferId: transfer.id },
            });
            notified = sent.sent;
          }
        }
      } catch (mailErr: any) {
        console.warn('[affiliate-payouts] payout email failed:', code, mailErr?.message);
      }

      results.push({ ...base, transfer: transfer.id, notified });
    } catch (err: any) {
      const message = err?.message || 'Stripe transfer failed';
      if (err?.code === 'balance_insufficient') {
        // Balance moved between the check and the transfer. Not a failure.
        skip('insufficient_platform_balance');
        continue;
      }
      console.error('[affiliate-payouts] transfer failed:', code, message);
      await supabase
        .from('affiliate_commissions')
        .update({ status: 'failed' })
        .in('id', commissionIds);
      await supabase.from('payout_requests').insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: code,
        amount,
        stripe_account_id: affiliate.stripe_account_id,
        payout_method: 'stripe',
        status: 'rejected',
        error_message: message.slice(0, 500),
        notes: 'Automatic payout failed',
      });
      failed++;
      results.push({ ...base, error: message });
    }
  }

  return { checked: due.length, paid, skipped, failed, results };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const dryRun = req.body?.dryRun === true || req.query?.dryRun === '1';
  try {
    const summary = await runAffiliatePayouts({ dryRun });
    return res.status(200).json({ success: true, dryRun, ...summary });
  } catch (err: any) {
    console.error('[affiliate-payouts] run failed:', err?.message);
    return res.status(500).json({ error: 'Affiliate payout run failed', message: err?.message });
  }
}
