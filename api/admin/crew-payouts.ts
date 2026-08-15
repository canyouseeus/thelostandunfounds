import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isAdmin, toMoney, holdDays, resolveConnectAccount, PHOTOGRAPHER_SELECT, type PhotographerRow } from '../../lib/api-handlers/crew/_shared.js';
import { runCrewPayouts } from '../../lib/api-handlers/crew/send-payouts.js';
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js';
import {
  sendCrewPayoutNotification,
  sendContractorPayoutNotification,
} from '../../lib/api-handlers/crew/_payout-notification.js';

/**
 * Admin view and control of crew (job) payouts.
 *
 *   GET                      → every payout, newest first
 *   POST { action: 'send' }  → run the payer now, optionally for one payout
 *   POST { action: 'create' }→ log a payout for work that never went through
 *                              an invoice (cash job, retainer, day rate)
 *
 * Deliberately not a Stripe-dashboard errand: the credentials already live
 * here, so paying a contractor is a button in the admin panel rather than a
 * manual transfer someone has to remember to make.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('crew_payouts')
        .select('id, photographer_id, user_id, invoice_id, amount, status, description, available_at, paid_at, stripe_transfer_id, stripe_account_id, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return res.status(200).json({ payouts: data || [] });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const action = (req.body?.action as string) || 'send';

    if (action === 'send') {
      const summary = await runCrewPayouts({
        payoutId: req.body?.payoutId,
        dryRun: req.body?.dryRun === true,
      });
      return res.status(200).json({ success: true, ...summary });
    }

    if (action === 'test-notification') {
      // Fire the real payout notification with sample values, so the template
      // and the delivery path are proven before a live payout depends on them.
      // Clearly marked as a test in the body it sends.
      const result = await sendCrewPayoutNotification({
        contractorName: req.body?.contractorName || 'TEST, not a real payout',
        amount: Number(req.body?.amount) || 120,
        description: 'TEST NOTIFICATION: no money moved. Verifying the payout email path.',
        transferId: 'tr_test_no_money_moved',
        destinationAccountId: req.body?.destination || 'acct_test',
        remainingBalance: Number(req.body?.remainingBalance) || 0,
      });
      return res.status(result.success ? 200 : 500).json({
        success: result.success,
        provider: result.provider,
        error: result.error,
        note: 'No money moved. This only exercises the notification path.',
      });
    }

    if (action === 'notify-contractor') {
      // Send (or re-send) the contractor's "you've been paid" notice for a row
      // that is already paid. Covers payouts made before contractors were
      // notified at all, and a re-send when a mail attempt failed.
      const { payoutId } = req.body || {};
      if (!payoutId) return res.status(400).json({ error: 'payoutId is required' });

      const { data: row } = await supabase
        .from('crew_payouts')
        .select('id, amount, description, status, stripe_transfer_id, photographers(name, email)')
        .eq('id', payoutId)
        .maybeSingle();
      if (!row) return res.status(404).json({ error: 'Payout not found' });
      if (row.status !== 'paid') {
        return res.status(400).json({
          error: `Payout is ${row.status}, not paid; nothing to notify about.`,
        });
      }

      const rel: any = Array.isArray(row.photographers) ? row.photographers[0] : row.photographers;
      if (!rel?.email) return res.status(400).json({ error: 'No contractor email on file' });

      const sent = await sendContractorPayoutNotification({
        to: rel.email,
        contractorName: rel.name || 'Contractor',
        amount: toMoney(row.amount),
        description: row.description,
        transferId: row.stripe_transfer_id || 'n/a',
      });
      return res.status(sent.success ? 200 : 500).json({
        success: sent.success,
        to: rel.email,
        provider: sent.provider,
        error: sent.error,
      });
    }

    if (action === 'update-stripe-email') {
      // Change the email on a contractor's Express account.
      //
      // Express dashboard login is email plus a one-time code, so this is what
      // decides which inbox a contractor signs in through. Someone who onboarded
      // with the wrong address does NOT need a new account: the platform uses
      // Express, which creates accounts rather than attaching existing ones, so
      // "connect my other Stripe account" would only produce another new Express
      // account. Changing this field gets the same result without reversing a
      // payout, redoing KYC, or re-verifying a bank.
      const { photographerId, email } = req.body || {};
      if (!photographerId) return res.status(400).json({ error: 'photographerId is required' });
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email is required' });
      }

      const { data: photographer } = await supabase
        .from('photographers')
        .select(PHOTOGRAPHER_SELECT)
        .eq('id', photographerId)
        .maybeSingle();
      if (!photographer) return res.status(404).json({ error: 'Photographer not found' });

      const { accountId } = await resolveConnectAccount(supabase, photographer as PhotographerRow);
      if (!accountId) return res.status(400).json({ error: 'No Stripe account connected' });

      const stripe = getStripe();
      const before = await stripe.accounts.retrieve(accountId);
      const updated = await stripe.accounts.update(accountId, { email });

      return res.status(200).json({
        success: true,
        accountId,
        previousEmail: before.email,
        email: updated.email,
        payoutsEnabled: updated.payouts_enabled,
      });
    }

    if (action === 'reverse-and-disconnect') {
      // Take a payout back and detach the contractor's Stripe account, so they
      // can onboard again from scratch.
      //
      // Needed because a Stripe-managed Express account will not let the
      // platform edit its email ("This application is not authorized to edit
      // the parameter 'email'"), so a contractor who onboarded with the wrong
      // address cannot be fixed in place from here; the account has to go.
      //
      // Order matters. Reverse first: the funds must leave the connected
      // account before it is detached, or they are stranded in an account
      // nobody is going to log into. The reversal only works while the money
      // is still in their Stripe balance, once Stripe pays it out to their
      // bank, this route stops being available.
      const { payoutId, skipReversal } = req.body || {};
      if (!payoutId) return res.status(400).json({ error: 'payoutId is required' });

      const { data: row } = await supabase
        .from('crew_payouts')
        .select('id, amount, status, stripe_transfer_id, stripe_account_id, photographer_id, description')
        .eq('id', payoutId)
        .maybeSingle();
      if (!row) return res.status(404).json({ error: 'Payout not found' });

      const stripe = getStripe();
      const steps: Record<string, unknown> = {};

      // 1. Reverse the transfer.
      if (!skipReversal) {
        if (row.status !== 'paid' || !row.stripe_transfer_id) {
          return res.status(400).json({
            error: `Payout is ${row.status} with transfer ${row.stripe_transfer_id || 'none'}, nothing to reverse.`,
          });
        }
        try {
          const reversal = await stripe.transfers.createReversal(row.stripe_transfer_id, {
            description: 'Contractor requested account teardown; payout returned pending re-onboarding.',
          });
          steps.reversal = { id: reversal.id, amount: reversal.amount / 100 };
        } catch (err: any) {
          // Most likely cause: Stripe already paid it out to their bank.
          return res.status(400).json({
            error: 'Could not reverse the transfer.',
            message: err?.message,
            hint: 'If the funds already reached their bank, this cannot be undone from here.',
          });
        }

        // Put the row back in the queue. Once they reconnect, the normal payer
        // sends it again: no manual transfer, no second ledger entry.
        await supabase
          .from('crew_payouts')
          .update({
            status: 'pending',
            stripe_transfer_id: null,
            stripe_account_id: null,
            paid_at: null,
            available_at: new Date().toISOString(),
            notes: `Reversed ${new Date().toISOString()} at contractor's request; re-pays automatically once they reconnect Stripe.`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        steps.ledgerReset = true;
      }

      // 2. Detach the account everywhere we reference it, so the next
      //    onboarding creates a fresh one instead of reusing the old id.
      const accountId = row.stripe_account_id;
      if (row.photographer_id) {
        await supabase
          .from('photographers')
          .update({ stripe_account_id: null })
          .eq('id', row.photographer_id);
      }
      if (accountId) {
        await supabase
          .from('affiliates')
          .update({
            stripe_account_id: null,
            stripe_account_status: 'pending',
            stripe_payouts_enabled: false,
            stripe_charges_enabled: false,
            stripe_details_submitted: false,
          })
          .eq('stripe_account_id', accountId);
        await supabase
          .from('affiliate_payout_settings')
          .update({ stripe_account_id: null })
          .eq('stripe_account_id', accountId);
      }
      steps.detached = accountId;

      // 3. Delete the Stripe account itself. Best-effort and last: if Stripe
      //    refuses, the platform references are already cleared, so the
      //    contractor can still onboard fresh.
      if (accountId) {
        try {
          const deleted = await stripe.accounts.del(accountId);
          steps.stripeDeleted = deleted.deleted;
        } catch (err: any) {
          steps.stripeDeleted = false;
          steps.stripeDeleteError = err?.message;
        }
      }

      return res.status(200).json({ success: true, steps });
    }

    if (action === 'create') {
      const { photographerId, amount, description, availableAt, notes } = req.body || {};
      const value = toMoney(amount);
      if (!photographerId) return res.status(400).json({ error: 'photographerId is required' });
      if (value <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });

      const { data: photographer } = await supabase
        .from('photographers')
        .select(PHOTOGRAPHER_SELECT)
        .eq('id', photographerId)
        .maybeSingle();
      if (!photographer) return res.status(404).json({ error: 'Photographer not found' });

      const { accountId } = await resolveConnectAccount(supabase, photographer as PhotographerRow);
      const available =
        availableAt || new Date(Date.now() + holdDays() * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('crew_payouts')
        .insert({
          photographer_id: photographer.id,
          user_id: (photographer as PhotographerRow).user_id,
          amount: value,
          description: (description || 'Photography job payout').slice(0, 300),
          status: 'pending',
          available_at: available,
          stripe_account_id: accountId,
          notes: notes || null,
        })
        .select('id, amount, status, available_at, stripe_account_id')
        .single();
      if (error) throw error;

      return res.status(200).json({ success: true, payout: data });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    console.error('[admin/crew-payouts] error:', err?.message);
    return res.status(500).json({ error: 'Crew payout request failed', message: err?.message });
  }
}
