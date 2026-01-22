import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Get reward points history for affiliate
 * GET /api/affiliates/points-history?affiliate_id=xxx
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { affiliate_id } = req.query;

    if (!affiliate_id) {
      return res.status(400).json({ error: 'affiliate_id required' });
    }

    // Get affiliate's current points
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('reward_points')
      .eq('id', affiliate_id as string)
      .single();

    // Get points history
    const { data: history, error: historyError } = await supabase
      .from('reward_points_history')
      .select('*')
      .eq('affiliate_id', affiliate_id as string)
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('Error fetching points history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch points history' });
    }

    // Calculate breakdown by source
    const breakdown = {
      from_sales: history?.filter(h => h.source === 'sale').reduce((sum, h) => sum + h.points, 0) || 0,
      from_self_purchase: history?.filter(h => h.source === 'self_purchase').reduce((sum, h) => sum + h.points, 0) || 0,
      from_bonus: history?.filter(h => h.source === 'bonus').reduce((sum, h) => sum + h.points, 0) || 0
    };

    return res.status(200).json({
      total_points: affiliate?.reward_points || 0,
      history: history || [],
      breakdown
    });

  } catch (error) {
    console.error('Points history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

