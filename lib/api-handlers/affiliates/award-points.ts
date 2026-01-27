import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Award reward points to affiliate
 * POST /api/affiliates/award-points
 * Body: { 
 *   affiliate_id: string, 
 *   profit_amount: number,
 *   source: 'sale' | 'self_purchase' | 'adjustment',
 *   commission_id?: string,
 *   description?: string
 * }
 * Note: 'bonus' source is not allowed - affiliates should not get points for bonuses
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for award-points');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { affiliate_id, profit_amount, source, commission_id, description } = req.body;

    if (!affiliate_id || !profit_amount || !source) {
      return res.status(400).json({ error: 'affiliate_id, profit_amount, and source required' });
    }

    // Reject bonus source - affiliates should not get points for bonuses
    if (source === 'bonus') {
      return res.status(400).json({ error: 'Points cannot be awarded for bonuses' });
    }

    // Calculate points: 1 point per $10 profit (floor division)
    const points = Math.floor(profit_amount / 10);

    if (points === 0) {
      return res.status(200).json({
        success: true,
        points: 0,
        message: 'Profit amount too small to award points'
      });
    }

    // Create points history record
    const { data: historyRecord, error: historyError } = await supabase
      .from('reward_points_history')
      .insert({
        affiliate_id,
        points,
        profit_amount,
        source,
        commission_id: commission_id || null,
        description: description || `${source}: $${profit_amount.toFixed(2)} profit`
      })
      .select()
      .single();

    if (historyError) {
      console.error('Error creating points history:', historyError);
      return res.status(500).json({ error: 'Failed to create points history' });
    }

    // Update affiliate's total points
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('reward_points')
      .eq('id', affiliate_id)
      .single();

    if (affiliate) {
      const newTotal = (affiliate.reward_points || 0) + points;

      const { error: updateError } = await supabase
        .from('affiliates')
        .update({ reward_points: newTotal })
        .eq('id', affiliate_id);

      if (updateError) {
        console.error('Error updating affiliate points:', updateError);
        return res.status(500).json({ error: 'Failed to update affiliate points' });
      }

      return res.status(200).json({
        success: true,
        points_awarded: points,
        new_total: newTotal,
        history_id: historyRecord.id
      });
    }

    return res.status(404).json({ error: 'Affiliate not found' });

  } catch (error) {
    console.error('Award points error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

