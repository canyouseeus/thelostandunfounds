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

    const currentYear = Number(
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 4)
    );

    // Get current year pot
    const { data: pot, error: potError } = await supabase
      .from('secret_santa_pot')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (potError || !pot) {
      return res.status(404).json({ error: 'Pot not found for current year' });
    }

    // The payout (distribute_secret_santa) weights by reward points EARNED THIS
    // YEAR, active affiliates only. The estimate uses the same numbers.
    const { data: active } = await supabase
      .from('affiliates')
      .select('id')
      .eq('status', 'active');
    const activeIds = new Set((active || []).map((a: any) => a.id));

    const { data: history } = await supabase
      .from('reward_points_history')
      .select('affiliate_id, points')
      .gte('created_at', `${currentYear}-01-01T06:00:00`)
      .lt('created_at', `${currentYear + 1}-01-01T06:00:00`);

    const byAffiliate = new Map<string, number>();
    for (const h of history || []) {
      if (!activeIds.has(h.affiliate_id)) continue;
      byAffiliate.set(h.affiliate_id, (byAffiliate.get(h.affiliate_id) || 0) + (h.points || 0));
    }
    const allAffiliates = [...byAffiliate.values()].filter((p) => p > 0);
    const totalPoints = allAffiliates.reduce((sum, p) => sum + p, 0);
    const yourPoints = byAffiliate.get(affiliate_id as string) || 0;
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
      total_affiliates: allAffiliates.length,
      your_points: yourPoints,
      total_points: totalPoints,
      your_estimated_share: yourEstimatedShare,
      your_percentage: yourPercentage
    });

  } catch (error) {
    console.error('Secret Santa error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


