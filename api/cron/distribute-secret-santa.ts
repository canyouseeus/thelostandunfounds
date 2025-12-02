import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to distribute Secret Santa pot annually on December 26
 * First distribution: December 26, 2026
 * Runs automatically via Vercel cron
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const currentYear = new Date().getFullYear();
    
    // Only distribute if it's 2026 or later (first distribution is 2026)
    if (currentYear < 2026) {
      return res.status(200).json({
        message: `Secret Santa distribution starts in 2026. Current year: ${currentYear}`,
        skipped: true
      });
    }

    // Get pot for current year
    const { data: pot, error: potError } = await supabase
      .from('secret_santa_pot')
      .select('*')
      .eq('year', currentYear)
      .single();

    if (potError || !pot) {
      return res.status(404).json({ error: `Pot not found for year ${currentYear}` });
    }

    if (pot.distributed) {
      return res.status(200).json({
        message: `Pot for ${currentYear} already distributed`,
        distribution_date: pot.distribution_date,
        skipped: true
      });
    }

    if (parseFloat(pot.total_amount) === 0) {
      return res.status(200).json({
        message: `Pot for ${currentYear} is empty, nothing to distribute`,
        skipped: true
      });
    }

    // Get all active affiliates with their reward points
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code, reward_points, user_id')
      .eq('status', 'active')
      .gt('reward_points', 0)
      .order('reward_points', { ascending: false });

    if (affiliatesError || !affiliates || affiliates.length === 0) {
      return res.status(200).json({
        message: 'No active affiliates with points',
        skipped: true
      });
    }

    // Calculate total points
    const totalPoints = affiliates.reduce((sum, a) => sum + (a.reward_points || 0), 0);

    if (totalPoints === 0) {
      return res.status(200).json({
        message: 'No points to distribute against',
        skipped: true
      });
    }

    const distributions = [];
    const potAmount = parseFloat(pot.total_amount);

    // Calculate and create distributions
    for (const affiliate of affiliates) {
      if (affiliate.reward_points === 0) continue;

      const share = (affiliate.reward_points / totalPoints) * potAmount;

      // Create commission record for payout
      const { data: commission, error: commissionError } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: affiliate.id,
          order_id: `SECRET-SANTA-${currentYear}`,
          amount: share,
          status: 'pending',
          type: 'secret_santa'
        })
        .select()
        .single();

      if (!commissionError && commission) {
        distributions.push({
          affiliate_id: affiliate.id,
          affiliate_code: affiliate.affiliate_code,
          reward_points: affiliate.reward_points,
          share: share,
          percentage: ((affiliate.reward_points / totalPoints) * 100).toFixed(2)
        });

        // Update affiliate's total earnings
        const { data: currentAffiliate } = await supabase
          .from('affiliates')
          .select('total_earnings')
          .eq('id', affiliate.id)
          .single();

        if (currentAffiliate) {
          await supabase
            .from('affiliates')
            .update({
              total_earnings: (parseFloat(currentAffiliate.total_earnings || '0') + share).toFixed(2)
            })
            .eq('id', affiliate.id);
        }
      }
    }

    // Mark pot as distributed (December 26th of current year)
    const distributionDate = `${currentYear}-12-26`;
    const { error: updateError } = await supabase
      .from('secret_santa_pot')
      .update({
        distributed: true,
        distribution_date: distributionDate
      })
      .eq('id', pot.id);

    if (updateError) {
      console.error('Error marking pot as distributed:', updateError);
      return res.status(500).json({ error: 'Failed to mark pot as distributed' });
    }

    return res.status(200).json({
      success: true,
      year: currentYear,
      pot_amount: potAmount,
      total_points: totalPoints,
      affiliates_paid: distributions.length,
      distribution_date: distributionDate,
      distributions
    });

  } catch (error) {
    console.error('Secret Santa cron error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

