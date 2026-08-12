import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '../affiliates/_stripe-client.js';
import {
  sendCrewPayoutNotification,
  sendContractorPayoutNotification,
} from './_payout-notification.js';
import {
  getSupabaseAdmin,
  isAdmin,
  isCronAuthorized,
  resolveConnectAccount,
  toMoney,
  PHOTOGRAPHER_SELECT,
  type PhotographerRow,
} from './_shared.js';

/**
 * Pay out settled crew payouts to their Stripe Connect accounts.
 *
 * Runs on a schedule (see vercel.json) and can be invoked by an admin for a
 * single payout. The scheduled run is the point of the whole feature: a
 * contractor's shoot pay should land without anyone remembering to send it.
 *
 * Three guards stand between a ledger row and a transfer:
 *  1. `available_at` — the settlement hold, so we don't try to move money
 *     Stripe has not yet released from the client's card payment.
 *  2. The platform's available balance — a transfer against an unsettled
 *     balance fails, and a failure marks the row and stops the retry loop.
 *     Checking first means an early run is a no-op instead of a dead row.
 *  3. `payouts_enabled` on the destination — a contractor who has not finished
 *     onboarding keeps accruing, and gets paid the run after they finish.
 */

interface PayoutRow {
  id: string;
  photographer_id: string | null;
  user_id: string | null;
  invoice_id: string | null;
  amount: number | string;
  description: string | null;
  stripe_account_id: string | null;
  // PostgREST types an embedded relation as an array even when the FK makes it
  // at most one row, so accept both shapes rather than casting the difference away.
  photographers?: PhotographerRel | PhotographerRel[] | null;
}

interface PhotographerRel {
  name: string | null;
  email: string | null;
}

function photographerRel(row: PayoutRow): PhotographerRel | null {
  const rel = row.photographers;
  return (Array.isArray(rel) ? rel[0] : rel) || null;
}

function contractorName(row: PayoutRow): string {
  return photographerRel(row)?.name || 'Contractor';
}

const PAYOUT_SELECT =
  'id, photographer_id, user_id, invoice_id, amount, description, stripe_account_id, photographers(name, email)';

async function availablePlatformBalance(): Promise<number> {
  const stripe = getStripe();
  const balance = await stripe.balance.retrieve();
  const usd = (balance.available || []).find(b => b.currency === 'usd');
  return toMoney((usd?.amount || 0) / 100);
}

async function destinationFor(
  supabase: SupabaseClient,
  row: PayoutRow
): Promise<{ accountId: string | null; payoutsEnabled: boolean }> {
  if (row.stripe_account_id) return { accountId: row.stripe_account_id, payoutsEnabled: true };
  if (!row.photographer_id) return { accountId: null, payoutsEnabled: false };

  const { data } = await supabase
    .from('photographers')
    .select(PHOTOGRAPHER_SELECT)
    .eq('id', row.photographer_id)
    .maybeSingle();
  if (!data) return { accountId: null, payoutsEnabled: false };

  return resolveConnectAccount(supabase, data as PhotographerRow);
}

export async function runCrewPayouts(options: { payoutId?: string; dryRun?: boolean } = {}) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  let query = supabase
    .from('crew_payouts')
    .select(PAYOUT_SELECT)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });

  if (options.payoutId) {
    // An admin sending one payout by hand overrides the settlement hold —
    // they can see the balance and are choosing to release it early.
    query = query.eq('id', options.payoutId);
  } else {
    query = query.lte('available_at', now);
  }

  const { data: due, error } = await query;
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  if (!due?.length) return { checked: 0, paid: 0, skipped: 0, failed: 0, results };

  let balance = await availablePlatformBalance();
  let paid = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of due as PayoutRow[]) {
    const amount = toMoney(row.amount);
    const { accountId, payoutsEnabled } = await destinationFor(supabase, row);

    if (!accountId) {
      skipped++;
      results.push({ id: row.id, amount, skipped: 'no_connected_account' });
      continue;
    }
    if (!payoutsEnabled) {
      skipped++;
      results.push({ id: row.id, amount, skipped: 'payouts_not_enabled' });
      continue;
    }
    if (amount > balance) {
      // Funds have not landed yet. Leave the row alone — the next run retries.
      skipped++;
      results.push({ id: row.id, amount, skipped: 'insufficient_balance', balance });
      continue;
    }
    if (options.dryRun) {
      results.push({ id: row.id, amount, wouldPay: accountId });
      balance = toMoney(balance - amount);
      continue;
    }

    try {
      const transfer = await getStripe().transfers.create(
        {
          amount: Math.round(amount * 100),
          currency: 'usd',
          destination: accountId,
          description: (row.description || 'Photography job payout').slice(0, 200),
          metadata: {
            crew_payout_id: row.id,
            photographer_id: row.photographer_id || '',
            invoice_id: row.invoice_id || '',
            kind: 'crew_job_payout',
          },
        },
        // Keyed on the ledger row, so a retried run can never double-pay.
        { idempotencyKey: `crew_payout_${row.id}` }
      );

      await supabase
        .from('crew_payouts')
        .update({
          status: 'paid',
          stripe_transfer_id: transfer.id,
          stripe_account_id: accountId,
          paid_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      balance = toMoney(balance - amount);
      paid++;

      // Tell the owner the money moved. Best-effort by design: the transfer has
      // already succeeded and the row is already marked paid, so a mail failure
      // must not make either look otherwise.
      const notified = await sendCrewPayoutNotification({
        contractorName: contractorName(row),
        amount,
        description: row.description,
        transferId: transfer.id,
        destinationAccountId: accountId,
        remainingBalance: balance,
      });
      if (!notified.success) {
        console.warn('[crew-payouts] payout notification failed:', row.id, notified.error);
      }

      // And tell the person who actually did the work. Separate send rather
      // than a CC: the owner's copy carries the platform balance, which is
      // none of the contractor's business.
      const contractorEmail = photographerRel(row)?.email;
      let contractorNotified: boolean | null = null;
      if (contractorEmail) {
        const sent = await sendContractorPayoutNotification({
          to: contractorEmail,
          contractorName: contractorName(row),
          amount,
          description: row.description,
          transferId: transfer.id,
        });
        contractorNotified = sent.success;
        if (!sent.success) {
          console.warn('[crew-payouts] contractor notification failed:', row.id, sent.error);
        }
      } else {
        console.warn('[crew-payouts] no contractor email on file, skipping their notice:', row.id);
      }

      results.push({
        id: row.id,
        amount,
        transfer: transfer.id,
        notified: notified.success,
        contractorNotified,
      });
    } catch (err: any) {
      const message = err?.message || 'Stripe transfer failed';
      console.error('[crew-payouts] transfer failed:', row.id, message);
      await supabase
        .from('crew_payouts')
        .update({
          status: 'failed',
          error_message: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      failed++;
      results.push({ id: row.id, amount, error: message });
    }
  }

  return { checked: due.length, paid, skipped, failed, results };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isCronAuthorized(req) && !isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payoutId = (req.body?.payoutId as string) || (req.query?.payoutId as string) || undefined;
  const dryRun = req.body?.dryRun === true || req.query?.dryRun === '1';

  try {
    const summary = await runCrewPayouts({ payoutId, dryRun });
    return res.status(200).json({ success: true, dryRun, ...summary });
  } catch (err: any) {
    console.error('[crew-payouts] run failed:', err?.message);
    return res.status(500).json({ error: 'Crew payout run failed', message: err?.message });
  }
}
