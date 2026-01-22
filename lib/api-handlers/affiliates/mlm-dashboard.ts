import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Get comprehensive MLM dashboard data
 * GET /api/affiliates/mlm-dashboard?affiliate_id=xxx
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for mlm-dashboard');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { affiliate_id } = req.query;

    if (!affiliate_id) {
      return res.status(400).json({ error: 'affiliate_id required' });
    }

    // Get affiliate data
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id as string)
      .single();

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Get referral counts
    const { data: level1Refs } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referred_by', affiliate_id as string);

    const level1Ids = level1Refs?.map(r => r.id) || [];

    const { data: level2Refs } = level1Ids.length > 0
      ? await supabase
        .from('affiliates')
        .select('id')
        .in('referred_by', level1Ids)
      : { data: [] };

    // Get customer count
    const { data: customers } = await supabase
      .from('affiliate_customers')
      .select('id')
      .eq('referred_by_affiliate_id', affiliate_id as string);

    // Get MLM earnings totals
    const { data: mlmEarnings } = await supabase
      .from('mlm_earnings')
      .select('amount, level')
      .eq('affiliate_id', affiliate_id as string);

    const mlmLevel1 = mlmEarnings?.filter(e => e.level === 1).reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const mlmLevel2 = mlmEarnings?.filter(e => e.level === 2).reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    // Get discount code (always available, usage controlled by last_discount_use_date)
    const { data: discountCodeData } = await supabase
      .from('affiliate_discount_codes')
      .select('code, is_active')
      .eq('affiliate_id', affiliate_id as string)
      .single();

    // If no code exists, generate one
    let discountCode = discountCodeData;
    if (!discountCode) {
      const code = `${affiliate.affiliate_code}-EMPLOYEE`;
      const { data: newCode } = await supabase
        .from('affiliate_discount_codes')
        .insert({
          affiliate_id,
          code,
          discount_percent: 42.00,
          is_active: true
        })
        .select()
        .single();

      discountCode = newCode;
    }

    return res.status(200).json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliate_code,
        reward_points: affiliate.reward_points,
        discount_credit_balance: affiliate.discount_credit_balance,
        total_mlm_earnings: affiliate.total_mlm_earnings,
        last_discount_use_date: affiliate.last_discount_use_date
      },
      network: {
        total_customers: customers?.length || 0,
        level1_affiliates: level1Refs?.length || 0,
        level2_affiliates: level2Refs?.length || 0,
        total_network: (level1Refs?.length || 0) + (level2Refs?.length || 0)
      },
      earnings: {
        mlm_level1: mlmLevel1,
        mlm_level2: mlmLevel2,
        total_mlm: mlmLevel1 + mlmLevel2
      },
      discount_code: discountCode
    });

  } catch (error) {
    console.error('MLM dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

