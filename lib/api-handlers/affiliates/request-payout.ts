import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const MIN_PAYOUT = 10;

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const normalizeCode = (code?: string | null) =>
  code?.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;

async function findAffiliate(userId?: string, affiliateCode?: string | null) {
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

async function getPayoutSettings(userId: string) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .select('paypal_email, payment_threshold')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function hasPendingRequest(affiliateId: string) {
  const { data, error } = await supabase
    .from('payout_requests')
    .select('id')
    .eq('affiliate_id', affiliateId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const affiliate = await findAffiliate(userId, affiliateCode);

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (affiliate.status && affiliate.status !== 'active') {
      return res.status(400).json({ error: 'Affiliate account must be active to request payouts' });
    }

    const availableEarnings = toMoney(Number(affiliate.total_earnings ?? 0));
    if (availableEarnings < numericAmount) {
      return res.status(400).json({ error: 'Requested amount exceeds available earnings' });
    }

    const payoutSettings = await getPayoutSettings(affiliate.user_id);

    if (!payoutSettings || !payoutSettings.paypal_email) {
      return res.status(400).json({ error: 'Set your PayPal email before requesting payouts' });
    }

    const threshold = toMoney(Number(payoutSettings.payment_threshold ?? MIN_PAYOUT));
    if (numericAmount < Math.max(MIN_PAYOUT, threshold)) {
      return res.status(400).json({
        error: `Payout amount must be at least $${Math.max(MIN_PAYOUT, threshold).toFixed(2)}`
      });
    }

    if (await hasPendingRequest(affiliate.id)) {
      return res.status(400).json({
        error: 'You already have a pending payout request. Please wait until it is processed.'
      });
    }

    const affiliateCodeValue =
      normalizeCode(affiliate.code) || normalizeCode(affiliate.affiliate_code) || 'UNKNOWN';

    const { data: request, error: insertError } = await supabase
      .from('payout_requests')
      .insert({
        affiliate_id: affiliate.id,
        user_id: affiliate.user_id,
        affiliate_code: affiliateCodeValue,
        amount: numericAmount,
        paypal_email: payoutSettings.paypal_email,
        status: 'pending',
        notes: notes ? String(notes).slice(0, 500) : null
      })
      .select('id, amount, status, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({
      success: true,
      request,
      message: 'Payout request submitted successfully'
    });
  } catch (error: any) {
    console.error('Affiliate payout request error:', error);
    return res.status(500).json({
      error: 'Failed to submit payout request',
      message: error?.message || 'Unknown error'
    });
  }
}
