import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get affiliate record
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Get referrals count
    const { count: referralsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id);

    // Get conversions count
    const { count: conversionsCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .eq('converted', true);

    // Get pending commissions
    const { data: pendingCommissions, count: pendingCount } = await supabase
      .from('commissions')
      .select('*', { count: 'exact' })
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending');

    const pendingAmount = pendingCommissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount.toString()), 0) || 0;

    // Get recent commissions (last 10)
    const { data: recentCommissions } = await supabase
      .from('commissions')
      .select(`
        *,
        referrals:referral_id (
          referred_user_id
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent referrals (last 10)
    const { data: recentReferrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('signup_date', { ascending: false })
      .limit(10);

    // Calculate conversion rate
    const conversionRate = referralsCount && referralsCount > 0
      ? ((conversionsCount || 0) / referralsCount * 100).toFixed(2)
      : '0.00';

    return res.status(200).json({
      success: true,
      affiliate: {
        id: affiliate.id,
        referral_code: affiliate.referral_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        total_earnings: affiliate.total_earnings,
        total_paid: affiliate.total_paid,
        paypal_email: affiliate.paypal_email,
      },
      stats: {
        total_referrals: referralsCount || 0,
        conversions: conversionsCount || 0,
        conversion_rate: conversionRate,
        pending_commissions: pendingCount || 0,
        pending_amount: pendingAmount.toFixed(2),
        total_earnings: affiliate.total_earnings,
        total_paid: affiliate.total_paid,
        available_balance: (parseFloat(affiliate.total_earnings.toString()) - parseFloat(affiliate.total_paid.toString())).toFixed(2),
      },
      recent_commissions: recentCommissions || [],
      recent_referrals: recentReferrals || [],
    });
  } catch (error) {
    console.error('Affiliate dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
