import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get affiliate's referrals (customers + affiliates)
 * GET /api/affiliates/referrals?affiliate_id=xxx&type=customers|affiliates|all
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { affiliate_id, type = 'all' } = req.query;

    if (!affiliate_id) {
      return res.status(400).json({ error: 'affiliate_id required' });
    }

    const result: any = {
      affiliate_id,
      customers: [],
      level1_affiliates: [],
      level2_affiliates: []
    };

    // Get customer referrals (lifetime ties)
    if (type === 'customers' || type === 'all') {
      const { data: customers, error: customersError } = await supabase
        .from('affiliate_customers')
        .select('*')
        .eq('referred_by_affiliate_id', affiliate_id as string)
        .order('created_at', { ascending: false });

      if (!customersError && customers) {
        result.customers = customers;
      }
    }

    // Get Level 1 affiliate referrals (direct)
    if (type === 'affiliates' || type === 'all') {
      const { data: level1, error: level1Error } = await supabase
        .from('affiliates')
        .select('id, affiliate_code, status, total_earnings, reward_points, created_at')
        .eq('referred_by', affiliate_id as string)
        .order('total_earnings', { ascending: false });

      if (!level1Error && level1) {
        result.level1_affiliates = level1;

        // Get Level 2 affiliate referrals (indirect)
        if (level1.length > 0) {
          const level1Ids = level1.map(a => a.id);
          const { data: level2, error: level2Error } = await supabase
            .from('affiliates')
            .select('id, affiliate_code, status, total_earnings, reward_points, created_at, referred_by')
            .in('referred_by', level1Ids)
            .order('total_earnings', { ascending: false });

          if (!level2Error && level2) {
            result.level2_affiliates = level2;
          }
        }
      }
    }

    // Calculate totals
    result.totals = {
      total_customers: result.customers.length,
      total_customer_profit: result.customers.reduce((sum: number, c: any) => sum + parseFloat(c.total_profit_generated || 0), 0),
      total_customer_purchases: result.customers.reduce((sum: number, c: any) => sum + c.total_purchases, 0),
      total_level1_affiliates: result.level1_affiliates.length,
      total_level2_affiliates: result.level2_affiliates.length,
      total_network_size: result.level1_affiliates.length + result.level2_affiliates.length
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Get referrals error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


