import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const MIN_THRESHOLD = 10;

const toMoney = (value: number) => {
  if (!Number.isFinite(value)) return MIN_THRESHOLD;
  return Math.max(MIN_THRESHOLD, Math.round(value * 100) / 100);
};

async function findAffiliateByUserId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('affiliates')
    .select('id, code, affiliate_code, stripe_account_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getSettings(supabase: SupabaseClient, affiliateId: string) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .select('payment_threshold')
    .eq('affiliate_id', affiliateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    payment_threshold: toMoney(Number(data?.payment_threshold ?? MIN_THRESHOLD))
  };
}

async function upsertThreshold(supabase: SupabaseClient, affiliateId: string, userId: string, stripeAccountId: string | null, threshold: number) {
  const { data, error } = await supabase
    .from('affiliate_payout_settings')
    .upsert(
      {
        affiliate_id: affiliateId,
        user_id: userId,
        stripe_account_id: stripeAccountId,
        payout_method: 'stripe',
        payment_threshold: threshold,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'affiliate_id' }
    )
    .select('payment_threshold')
    .single();

  if (error) {
    throw error;
  }

  return {
    payment_threshold: toMoney(Number(data.payment_threshold ?? MIN_THRESHOLD))
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for payout-settings');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const userId = (req.query.userId || req.query.user_id || req.body?.userId || req.body?.user_id) as
    | string
    | undefined;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const affiliate = await findAffiliateByUserId(supabase, userId);

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate account not found for user' });
    }

    if (req.method === 'GET') {
      const settings = await getSettings(supabase, affiliate.id);
      return res.status(200).json({ settings });
    }

    const rawThreshold = Number(req.body?.paymentThreshold ?? req.body?.payment_threshold ?? MIN_THRESHOLD);

    if (!Number.isFinite(rawThreshold)) {
      return res.status(400).json({ error: 'paymentThreshold must be a number' });
    }

    const paymentThreshold = toMoney(rawThreshold);

    const settings = await upsertThreshold(
      supabase,
      affiliate.id,
      userId,
      affiliate.stripe_account_id ?? null,
      paymentThreshold
    );

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
