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

const MIN_THRESHOLD = 10;

const defaultSettings = {
  paypal_email: '',
  payment_threshold: MIN_THRESHOLD
};

const normalizeEmail = (email: string) => email.trim();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return MIN_THRESHOLD;
  return Math.max(MIN_THRESHOLD, Math.round(value * 100) / 100);
};

async function findAffiliateByUserId(userId: string) {
  const { data, error } = await supabase
    .from('affiliates')
    .select('id, code, affiliate_code')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getSettings(affiliateId: string) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .select('paypal_email, payment_threshold')
    .eq('affiliate_id', affiliateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return defaultSettings;
  }

  return {
    paypal_email: data.paypal_email ?? '',
    payment_threshold: toMoney(Number(data.payment_threshold ?? MIN_THRESHOLD))
  };
}

async function upsertSettings(affiliateId: string, email: string, threshold: number) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .upsert(
      {
        affiliate_id: affiliateId,
        paypal_email: email,
        payment_threshold: threshold,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'affiliate_id' }
    )
    .select('paypal_email, payment_threshold')
    .single();

  if (error) {
    throw error;
  }

  return {
    paypal_email: data.paypal_email ?? '',
    payment_threshold: toMoney(Number(data.payment_threshold ?? MIN_THRESHOLD))
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.userId || req.query.user_id || req.body?.userId || req.body?.user_id) as
    | string
    | undefined;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const affiliate = await findAffiliateByUserId(userId);

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate account not found for user' });
    }

    if (req.method === 'GET') {
      const settings = await getSettings(affiliate.id);
      return res.status(200).json({ settings });
    }

    const paypalEmail = normalizeEmail(req.body?.paypalEmail || req.body?.paypal_email || '');
    const rawThreshold = Number(req.body?.paymentThreshold ?? req.body?.payment_threshold ?? MIN_THRESHOLD);

    if (!paypalEmail) {
      return res.status(400).json({ error: 'PayPal email is required' });
    }

    if (!isValidEmail(paypalEmail)) {
      return res.status(400).json({ error: 'Invalid PayPal email format' });
    }

    if (!Number.isFinite(rawThreshold)) {
      return res.status(400).json({ error: 'paymentThreshold must be a number' });
    }

    const paymentThreshold = toMoney(rawThreshold);

    const settings = await upsertSettings(affiliate.id, paypalEmail, paymentThreshold);

    return res.status(200).json({
      success: true,
      settings,
      message: 'Payout settings updated successfully'
    });
  } catch (error: any) {
    console.error('Affiliate payout settings error:', error);
    return res.status(500).json({
      error: 'Failed to process payout settings',
      message: error?.message || 'Unknown error'
    });
  }
}
