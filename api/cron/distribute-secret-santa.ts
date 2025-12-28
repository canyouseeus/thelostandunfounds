import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to distribute Secret Santa pot annually on December 25th
 * First distribution: December 25th, 2026
 * Runs automatically via Vercel cron
 * Evenly split among ALL active affiliates
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

    // Get ALL active affiliates (even split distribution)
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code, user_id')
      .eq('status', 'active');

    if (affiliatesError || !affiliates || affiliates.length === 0) {
      return res.status(200).json({
        message: 'No active affiliates found',
        skipped: true
      });
    }

    const distributions = [];
    const potAmount = parseFloat(pot.total_amount);
    const totalAffiliates = affiliates.length;
    const sharePerAffiliate = potAmount / totalAffiliates;

    // Calculate and create distributions (even split)
    for (const affiliate of affiliates) {
      const share = sharePerAffiliate;

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
          share: share,
          percentage: (100 / totalAffiliates).toFixed(2)
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

    // Mark pot as distributed (December 25th of current year)
    const distributionDate = `${currentYear}-12-25`;
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
      total_affiliates: totalAffiliates,
      share_per_affiliate: sharePerAffiliate,
      affiliates_paid: distributions.length,
      distribution_date: distributionDate,
      distributions
    });

  } catch (error) {
    console.error('Secret Santa cron error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

