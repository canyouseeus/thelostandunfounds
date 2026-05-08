import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from './_stripe-client.js';
import { sendAffiliateEmail } from './_emails.js';

const MIN_PAYOUT = 10;

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const normalizeCode = (code?: string | null) =>
  code?.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;

interface AffiliateRow {
  id: string;
  user_id: string;
  code: string | null;
  affiliate_code: string | null;
  status: string | null;
  total_earnings: number | null;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean | null;
  is_flagged: boolean | null;
  fraud_score: number | null;
}

async function findAffiliate(
  supabase: SupabaseClient,
  userId?: string,
  affiliateCode?: string | null
): Promise<AffiliateRow | null> {
  const fields =
    'id, user_id, code, affiliate_code, status, total_earnings, stripe_account_id, stripe_payouts_enabled, is_flagged, fraud_score';

  if (userId) {
    const { data, error } = await supabase
      .from('affiliates')
      .select(fields)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as AffiliateRow;
  }

  if (affiliateCode) {
    const normalizedCode = normalizeCode(affiliateCode);
    if (!normalizedCode) return null;
    const { data, error } = await supabase
      .from('affiliates')
      .select(fields)
      .or(`code.eq.${normalizedCode},affiliate_code.eq.${normalizedCode}`)
      .maybeSingle();
    if (error) throw error;
    return (data as AffiliateRow) || null;
  }

  return null;
}

async function getAvailableBalance(supabase: SupabaseClient, affiliateId: string) {
  const now = new Date().toISOString();

  const { data: availableCommissions } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .in('status', ['approved', 'confirmed'])
    .or(`available_date.lte.${now},available_date.is.null`);

  const { data: pendingCommissions } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .in('status', ['approved', 'confirmed', 'pending'])
    .gt('available_date', now)
    .order('available_date', { ascending: true });

  const available = (availableCommissions || []).reduce(
    (sum, c) => sum + toMoney(Number(c.amount ?? 0)),
    0
  );
  const pending = (pendingCommissions || []).reduce(
    (sum, c) => sum + toMoney(Number(c.amount ?? 0)),
    0
  );

  return {
    available: toMoney(available),
    pending: toMoney(pending),
  };
}

async function getAvailableCommissions(
  supabase: SupabaseClient,
  affiliateId: string,
  upToAmount: number
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('affiliate_commissions')
    .select('id, amount')
    .eq('affiliate_id', affiliateId)
    .in('status', ['approved', 'confirmed'])
    .or(`available_date.lte.${now},available_date.is.null`)
    .order('available_date', { ascending: true });
  if (error) throw error;

  const selected: { id: string; amount: number }[] = [];
  let total = 0;
  for (const c of data || []) {
    if (total >= upToAmount) break;
    const amt = toMoney(Number(c.amount ?? 0));
    selected.push({ id: c.id, amount: amt });
    total += amt;
  }
  return selected;
}

async function markCommissionsAsPaid(
  supabase: SupabaseClient,
  commissionIds: string[],
  transferId: string
) {
  await supabase
    .from('affiliate_commissions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_transfer_id: transferId,
    })
    .in('id', commissionIds);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    const { userId, affiliateCode, amount, notes } = req.body || {};

    if (!userId && !affiliateCode) {
      return res.status(400).json({ error: 'userId or affiliateCode is required' });
    }

    const numericAmount = toMoney(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid payout amount is required' });
    }

    if (numericAmount < MIN_PAYOUT) {
      return res.status(400).json({ error: `Minimum payout amount is $${MIN_PAYOUT}` });
    }

    const affiliate = await findAffiliate(supabase, userId, affiliateCode);
    if (!affiliate) return res.status(404).json({ error: 'Affiliate not found' });

    if (affiliate.status && affiliate.status !== 'active') {
      return res.status(400).json({ error: 'Affiliate account must be active to request payouts' });
    }

    if (affiliate.is_flagged) {
      return res.status(403).json({
        error: 'Account flagged for review. Payouts are paused — please contact support.',
        code: 'AFFILIATE_FLAGGED',
      });
    }

    if (!affiliate.stripe_account_id) {
      return res.status(400).json({
        error: 'Connect a Stripe account before requesting payouts.',
        code: 'STRIPE_NOT_CONNECTED',
      });
    }

    if (!affiliate.stripe_payouts_enabled) {
      return res.status(400).json({
        error: 'Your Stripe account is not yet enabled for payouts. Finish onboarding first.',
        code: 'STRIPE_PAYOUTS_DISABLED',
      });
    }

    const balances = await getAvailableBalance(supabase, affiliate.id);
    if (balances.available < numericAmount) {
      return res.status(400).json({
        error: 'Requested amount exceeds available balance',
        details: {
          requested: numericAmount,
          available: balances.available,
          pending: balances.pending,
        },
      });
    }

    const affiliateCodeValue =
      normalizeCode(affiliate.code) || normalizeCode(affiliate.affiliate_code) || 'UNKNOWN';

    const commissionsToMark = await getAvailableCommissions(supabase, affiliate.id, numericAmount);
    const actualAmount = commissionsToMark.reduce((sum, c) => sum + c.amount, 0);
    if (actualAmount < numericAmount) {
      return res.status(400).json({
        error: 'Balance changed. Please try again.',
        available: actualAmount,
      });
    }

    const stripe = getStripe();

    let transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: Math.round(numericAmount * 100),
          currency: 'usd',
          destination: affiliate.stripe_account_id,
          description: notes
            ? String(notes).slice(0, 200)
            : `Affiliate commission payout — ${affiliateCodeValue}`,
          metadata: {
            affiliate_id: affiliate.id,
            affiliate_code: affiliateCodeValue,
            user_id: affiliate.user_id || '',
          },
        },
        {
          idempotencyKey: `payout_${affiliate.id}_${Date.now()}`,
        }
      );
    } catch (stripeError: any) {
      console.error('[request-payout] Stripe transfer failed:', stripeError?.message);

      const errMsg = stripeError?.message || 'Stripe transfer failed';

      await supabase.from('payout_requests').insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: affiliateCodeValue,
        amount: numericAmount,
        stripe_account_id: affiliate.stripe_account_id,
        payout_method: 'stripe',
        status: 'rejected',
        error_message: errMsg,
        notes: notes ? `FAILED: ${notes}` : 'FAILED Payout Attempt',
      });

      // Email the affiliate
      try {
        const { data: userRow } = await supabase.auth.admin.getUserById(affiliate.user_id);
        if (userRow?.user?.email) {
          await sendAffiliateEmail({
            type: 'payout_failed',
            affiliateId: affiliate.id,
            to: userRow.user.email,
            data: { amount: numericAmount, reason: errMsg },
          });
        }
      } catch (e) { /* non-fatal */ }

      return res.status(500).json({
        error: 'Payment processing failed.',
        code: 'STRIPE_ERROR',
        message: errMsg,
      });
    }

    const commissionIds = commissionsToMark.map(c => c.id);
    await markCommissionsAsPaid(supabase, commissionIds, transfer.id);

    const { data: request } = await supabase
      .from('payout_requests')
      .insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: affiliateCodeValue,
        amount: numericAmount,
        stripe_account_id: affiliate.stripe_account_id,
        stripe_transfer_id: transfer.id,
        payout_method: 'stripe',
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: notes ? String(notes).slice(0, 500) : null,
      })
      .select('id, amount, status, created_at, paid_at')
      .single();

    // Email the affiliate
    try {
      const { data: userRow } = await supabase.auth.admin.getUserById(affiliate.user_id);
      if (userRow?.user?.email) {
        await sendAffiliateEmail({
          type: 'payout_sent',
          affiliateId: affiliate.id,
          referenceId: transfer.id,
          to: userRow.user.email,
          data: { amount: numericAmount, transferId: transfer.id },
        });
      }
    } catch (e) { /* non-fatal */ }

    return res.status(200).json({
      success: true,
      request,
      payout: {
        transfer_id: transfer.id,
        amount: numericAmount,
        destination: affiliate.stripe_account_id,
      },
      message: `$${numericAmount.toFixed(2)} has been transferred to your Stripe account.`,
    });
  } catch (error: any) {
    console.error('[request-payout] error:', error);
    return res.status(500).json({
      error: 'Failed to process payout request',
      message: error?.message || 'Unknown error',
    });
  }
}
