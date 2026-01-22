import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Get Secret Santa pot info and affiliate eligibility
 * GET /api/affiliates/secret-santa?affiliate_id=xxx
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

    const currentYear = new Date().getFullYear();

    // Get current year pot
    const { data: pot, error: potError } = await supabase
      .from('secret_santa_pot')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (potError || !pot) {
      return res.status(404).json({ error: 'Pot not found for current year' });
    }

    // Get affiliate's reward points
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('reward_points')
      .eq('id', affiliate_id as string)
      .single();

    // Get all active affiliates' points
    const { data: allAffiliates } = await supabase
      .from('affiliates')
      .select('reward_points')
      .eq('status', 'active')
      .gt('reward_points', 0);

    const totalPoints = allAffiliates?.reduce((sum, a) => sum + (a.reward_points || 0), 0) || 1;
    const yourPoints = affiliate?.reward_points || 0;
    const potAmount = parseFloat(pot.total_amount);

    const yourPercentage = totalPoints > 0 && yourPoints > 0
      ? (yourPoints / totalPoints) * 100
      : 0;

    const yourEstimatedShare = totalPoints > 0 && yourPoints > 0
      ? (yourPoints / totalPoints) * potAmount
      : 0;

    return res.status(200).json({
      year: pot.year,
      total_amount: potAmount,
      distributed: pot.distributed,
      distribution_date: pot.distribution_date,
      total_affiliates: allAffiliates?.length || 0,
      total_points: totalPoints,
      your_estimated_share: yourEstimatedShare,
      your_percentage: yourPercentage
    });

  } catch (error) {
    console.error('Secret Santa error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


