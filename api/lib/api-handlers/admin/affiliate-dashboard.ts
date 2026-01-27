import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin Affiliate Dashboard API
 * GET /api/admin/affiliate-dashboard
 * Returns summary metrics, affiliates, recent commissions, and payout requests
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Database service not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Affiliates list + summary
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select(
        'id, code, user_id, status, commission_rate, payment_threshold, paypal_email, total_earnings, total_clicks, total_conversions, total_mlm_earnings, created_at'
      )
      .order('created_at', { ascending: false });

    if (affiliatesError) {
      console.error('Error fetching affiliates:', affiliatesError);
      return res.status(500).json({
        error: 'Failed to fetch affiliates',
        details: affiliatesError.message,
        code: affiliatesError.code,
      });
    }

    // Build affiliate code map for enrichment
    const affiliateCodeMap = new Map<string, string>();
    (affiliates || []).forEach((a) => {
      affiliateCodeMap.set(a.id, a.code);
    });

    const baseSummary = (() => {
      const total = affiliates?.length || 0;
      const active = affiliates?.filter((a) => a.status === 'active').length || 0;
      const totalEarnings =
        affiliates?.reduce((sum, a) => sum + parseFloat(a.total_earnings || '0'), 0) || 0;
      const totalClicks = affiliates?.reduce((sum, a) => sum + (a.total_clicks || 0), 0) || 0;
      const totalConversions =
        affiliates?.reduce((sum, a) => sum + (a.total_conversions || 0), 0) || 0;

      return {
        total,
        active,
        inactive: total - active,
        totalEarnings,
        totalClicks,
        totalConversions,
      };
    })();

    // Recent commissions (without relationship join to avoid schema errors)
    const { data: commissions, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select(
        'id, affiliate_id, order_id, amount, profit_generated, product_cost, status, source, created_at, available_date, cancelled_reason, cancelled_at'
      )
      .order('created_at', { ascending: false })
      .limit(40);

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError);
      return res.status(500).json({
        error: 'Failed to fetch commissions',
        details: commissionsError.message,
        code: commissionsError.code,
      });
    }

    // Enrich commissions with affiliate code
    const enrichedCommissions = (commissions || []).map((c) => ({
      ...c,
      affiliates: { code: affiliateCodeMap.get(c.affiliate_id) || 'Unknown' }
    }));

    // Payout requests (without relationship join to avoid schema errors)
    const { data: payoutRequests, error: payoutError } = await supabase
      .from('payout_requests')
      .select(
        'id, affiliate_id, amount, currency, status, paypal_email, paypal_payout_batch_id, paypal_payout_item_id, error_message, created_at, processed_at'
      )
      .order('created_at', { ascending: false })
      .limit(40);

    if (payoutError) {
      console.error('Error fetching payout requests:', payoutError);
      return res.status(500).json({
        error: 'Failed to fetch payout requests',
        details: payoutError.message,
        code: payoutError.code,
      });
    }

    // Enrich payout requests with affiliate code
    const enrichedPayoutRequests = (payoutRequests || []).map((p) => ({
      ...p,
      affiliates: { code: affiliateCodeMap.get(p.affiliate_id) || 'Unknown' }
    }));

    const pendingPayoutTotal =
      payoutRequests?.reduce((sum, p) => {
        const amt = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as any);
        return p.status === 'pending' || p.status === 'processing' ? sum + (isNaN(amt) ? 0 : amt) : sum;
      }, 0) || 0;

    return res.status(200).json({
      summary: { ...baseSummary, pendingPayoutTotal },
      affiliates: affiliates || [],
      commissions: enrichedCommissions,
      payoutRequests: enrichedPayoutRequests,
    });
  } catch (error: any) {
    console.error('Admin Affiliate Dashboard API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
