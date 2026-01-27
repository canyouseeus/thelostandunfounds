import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createPayoutBatch, isPayoutsEnabled } from '../admin/paypal-payouts.js';

const MIN_PAYOUT = 10;

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const normalizeCode = (code?: string | null) =>
  code?.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;

async function findAffiliate(supabase: SupabaseClient, userId?: string, affiliateCode?: string | null) {
  if (userId) {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id, user_id, code, affiliate_code, status, total_earnings')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }
  }

  if (affiliateCode) {
    const normalizedCode = normalizeCode(affiliateCode);
    if (!normalizedCode) return null;

    const { data, error } = await supabase
      .from('affiliates')
      .select('id, user_id, code, affiliate_code, status, total_earnings')
      .or(`code.eq.${normalizedCode},affiliate_code.eq.${normalizedCode}`)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  return null;
}

async function getPayoutSettings(supabase: SupabaseClient, affiliateId: string) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .select('paypal_email, payment_threshold')
    .eq('affiliate_id', affiliateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Calculate available balance from commissions that have passed their holding period
 */
async function getAvailableBalance(supabase: SupabaseClient, affiliateId: string): Promise<{
  available: number;
  pending: number;
  nextAvailableDate: string | null;
  nextAvailableAmount: number;
}> {
  const now = new Date().toISOString();

  // Get available commissions (past holding period)
  const { data: availableCommissions, error: availableError } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .not('available_date', 'is', null)
    .lte('available_date', now);

  if (availableError) {
    console.error('Error fetching available commissions:', availableError);
    throw availableError;
  }

  // Get pending commissions (still in holding period)
  const { data: pendingCommissions, error: pendingError } = await supabase
    .from('affiliate_commissions')
    .select('amount, available_date')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .or(`available_date.is.null,available_date.gt.${now}`)
    .order('available_date', { ascending: true });

  if (pendingError) {
    console.error('Error fetching pending commissions:', pendingError);
    throw pendingError;
  }

  const available = (availableCommissions || []).reduce(
    (sum, c) => sum + toMoney(Number(c.amount ?? 0)),
    0
  );

  const pending = (pendingCommissions || []).reduce(
    (sum, c) => sum + toMoney(Number(c.amount ?? 0)),
    0
  );

  // Find next commission to become available
  const nextPending = pendingCommissions?.find(c => c.available_date);

  return {
    available: toMoney(available),
    pending: toMoney(pending),
    nextAvailableDate: nextPending?.available_date || null,
    nextAvailableAmount: nextPending ? toMoney(Number(nextPending.amount ?? 0)) : 0
  };
}

/**
 * Get available commissions for payout (to mark as paid)
 */
async function getAvailableCommissions(supabase: SupabaseClient, affiliateId: string, upToAmount: number) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('affiliate_commissions')
    .select('id, amount')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .not('available_date', 'is', null)
    .lte('available_date', now)
    .order('available_date', { ascending: true });

  if (error) {
    throw error;
  }

  // Select commissions up to the requested amount
  const selected: { id: string; amount: number }[] = [];
  let total = 0;

  for (const commission of (data || [])) {
    if (total >= upToAmount) break;
    selected.push({
      id: commission.id,
      amount: toMoney(Number(commission.amount ?? 0))
    });
    total += toMoney(Number(commission.amount ?? 0));
  }

  return selected;
}

/**
 * Mark commissions as paid
 */
async function markCommissionsAsPaid(
  supabase: SupabaseClient,
  commissionIds: string[],
  paypalBatchId: string,
  paypalItemId?: string
) {
  const { error } = await supabase
    .from('affiliate_commissions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paypal_batch_id: paypalBatchId,
      paypal_item_id: paypalItemId
    })
    .in('id', commissionIds);

  if (error) {
    throw error;
  }

  // Log status changes
  for (const id of commissionIds) {
    await supabase
      .from('commission_status_log')
      .insert({
        commission_id: id,
        previous_status: 'pending',
        new_status: 'paid',
        reason: 'PayPal payout processed',
        metadata: { paypal_batch_id: paypalBatchId, paypal_item_id: paypalItemId }
      });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for request-payout');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

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

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (affiliate.status && affiliate.status !== 'active') {
      return res.status(400).json({ error: 'Affiliate account must be active to request payouts' });
    }

    // Get available balance (only commissions past holding period)
    const balances = await getAvailableBalance(supabase, affiliate.id);

    if (balances.available < numericAmount) {
      return res.status(400).json({
        error: 'Requested amount exceeds available balance',
        details: {
          requested: numericAmount,
          available: balances.available,
          pending: balances.pending,
          message: `You have $${balances.available.toFixed(2)} available now. $${balances.pending.toFixed(2)} is still in the holding period.`
        }
      });
    }

    const payoutSettings = await getPayoutSettings(supabase, affiliate.id);

    if (!payoutSettings || !payoutSettings.paypal_email) {
      return res.status(400).json({ error: 'Set your PayPal email before requesting payouts' });
    }

    const threshold = toMoney(Number(payoutSettings.payment_threshold ?? MIN_PAYOUT));
    if (numericAmount < Math.max(MIN_PAYOUT, threshold)) {
      return res.status(400).json({
        error: `Payout amount must be at least $${Math.max(MIN_PAYOUT, threshold).toFixed(2)}`
      });
    }

    // Check if PayPal Payouts is enabled
    if (!isPayoutsEnabled()) {
      return res.status(503).json({
        error: 'Automated payouts are temporarily unavailable. Please try again later.',
        code: 'PAYOUTS_DISABLED'
      });
    }

    const affiliateCodeValue =
      normalizeCode(affiliate.code) || normalizeCode(affiliate.affiliate_code) || 'UNKNOWN';

    // Get commissions to mark as paid
    const commissionsToMark = await getAvailableCommissions(supabase, affiliate.id, numericAmount);
    const actualAmount = commissionsToMark.reduce((sum, c) => sum + c.amount, 0);

    if (actualAmount < numericAmount) {
      // Edge case: balance changed between check and fetch
      return res.status(400).json({
        error: 'Balance changed. Please try again.',
        available: actualAmount
      });
    }

    // Call PayPal Payouts API immediately
    console.log(`Processing instant payout: $${numericAmount} to ${payoutSettings.paypal_email} for affiliate ${affiliateCodeValue}`);

    let payoutResult;
    try {
      payoutResult = await createPayoutBatch([
        {
          requestId: `${affiliate.id}_${Date.now()}`,
          affiliateCode: affiliateCodeValue,
          amount: numericAmount,
          currency: 'USD',
          paypalEmail: payoutSettings.paypal_email,
          note: notes || `Commission payout for affiliate ${affiliateCodeValue}`
        }
      ]);
    } catch (paypalError: any) {
      console.error('PayPal payout failed:', paypalError);
      return res.status(500).json({
        error: 'Payment processing failed. Please try again later.',
        code: 'PAYPAL_ERROR',
        message: paypalError?.message
      });
    }

    // Mark commissions as paid
    const commissionIds = commissionsToMark.map(c => c.id);
    const paypalBatchId = payoutResult.batch_header.payout_batch_id;

    await markCommissionsAsPaid(supabase, commissionIds, paypalBatchId);

    // Create payout request record for history (status: paid)
    const { data: request, error: insertError } = await supabase
      .from('payout_requests')
      .insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: affiliateCodeValue,
        amount: numericAmount,
        paypal_email: payoutSettings.paypal_email,
        status: 'paid',
        paypal_batch_id: paypalBatchId,
        paid_at: new Date().toISOString(),
        notes: notes ? String(notes).slice(0, 500) : null
      })
      .select('id, amount, status, created_at, paid_at')
      .single();

    if (insertError) {
      console.error('Error creating payout record:', insertError);
      // Don't fail - the payment already went through
    }

    console.log(`Payout completed: $${numericAmount} to ${payoutSettings.paypal_email}, PayPal batch: ${paypalBatchId}`);

    return res.status(200).json({
      success: true,
      request,
      payout: {
        batch_id: paypalBatchId,
        status: payoutResult.batch_header.batch_status,
        amount: numericAmount
      },
      message: `$${numericAmount.toFixed(2)} has been sent to ${payoutSettings.paypal_email}`
    });
  } catch (error: any) {
    console.error('Affiliate payout request error:', error);
    return res.status(500).json({
      error: 'Failed to process payout request',
      message: error?.message || 'Unknown error'
    });
  }
}
