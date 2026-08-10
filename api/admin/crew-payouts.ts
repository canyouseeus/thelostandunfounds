import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, isAdmin, toMoney, holdDays, resolveConnectAccount, PHOTOGRAPHER_SELECT, type PhotographerRow } from '../../lib/api-handlers/crew/_shared.js';
import { runCrewPayouts } from '../../lib/api-handlers/crew/send-payouts.js';
import { sendCrewPayoutNotification } from '../../lib/api-handlers/crew/_payout-notification.js';

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
        contractorName: req.body?.contractorName || 'TEST — not a real payout',
        amount: Number(req.body?.amount) || 120,
        description: 'TEST NOTIFICATION — no money moved. Verifying the payout email path.',
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
