import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get MLM earnings history for affiliate
 * GET /api/affiliates/mlm-earnings?affiliate_id=xxx&level=1|2|all
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { affiliate_id, level = 'all' } = req.query;

    if (!affiliate_id) {
      return res.status(400).json({ error: 'affiliate_id required' });
    }

    let query = supabase
      .from('mlm_earnings')
      .select(`
        *,
        from_affiliate:affiliates!mlm_earnings_from_affiliate_id_fkey(
          affiliate_code,
          status
        ),
        commission:affiliate_commissions(
          order_id,
          amount,
          created_at
        )
      `)
      .eq('affiliate_id', affiliate_id as string)
      .order('created_at', { ascending: false });

    if (level !== 'all') {
      query = query.eq('level', parseInt(level as string));
    }

    const { data: earnings, error } = await query;

    if (error) {
      console.error('Error fetching MLM earnings:', error);
      return res.status(500).json({ error: 'Failed to fetch MLM earnings' });
    }

    // Calculate totals
    const totals = {
      total_earnings: earnings.reduce((sum, e) => sum + parseFloat(e.amount), 0),
      level1_earnings: earnings.filter(e => e.level === 1).reduce((sum, e) => sum + parseFloat(e.amount), 0),
      level2_earnings: earnings.filter(e => e.level === 2).reduce((sum, e) => sum + parseFloat(e.amount), 0),
      total_transactions: earnings.length,
      level1_transactions: earnings.filter(e => e.level === 1).length,
      level2_transactions: earnings.filter(e => e.level === 2).length
    };

    return res.status(200).json({
      affiliate_id,
      earnings,
      totals
    });

  } catch (error) {
    console.error('MLM earnings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


