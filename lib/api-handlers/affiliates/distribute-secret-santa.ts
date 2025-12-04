import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Distribute Secret Santa pot (annual Christmas distribution)
 * First distribution: December 25th, 2026
 * POST /api/affiliates/distribute-secret-santa
 * Body: { year: number }
 * Evenly split among ALL active affiliates
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({ error: 'year required' });
    }

    // Get pot for year
    const { data: pot, error: potError } = await supabase
      .from('secret_santa_pot')
      .select('*')
      .eq('year', year)
      .single();

    if (potError || !pot) {
      return res.status(404).json({ error: 'Pot not found for this year' });
    }

    if (pot.distributed) {
      return res.status(400).json({
        error: 'Pot already distributed',
        distribution_date: pot.distribution_date
      });
    }

    if (parseFloat(pot.total_amount) === 0) {
      return res.status(400).json({ error: 'Pot is empty, nothing to distribute' });
    }

    // Get ALL active affiliates (even split distribution)
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code, user_id')
      .eq('status', 'active');

    if (affiliatesError || !affiliates || affiliates.length === 0) {
      return res.status(400).json({ error: 'No active affiliates found' });
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
          order_id: `SECRET-SANTA-${year}`,
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

    // Mark pot as distributed
    const { error: updateError } = await supabase
      .from('secret_santa_pot')
      .update({
        distributed: true,
        distribution_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', pot.id);

    if (updateError) {
      console.error('Error marking pot as distributed:', updateError);
      return res.status(500).json({ error: 'Failed to mark pot as distributed' });
    }

    return res.status(200).json({
      success: true,
      year,
      pot_amount: potAmount,
      total_affiliates: totalAffiliates,
      share_per_affiliate: sharePerAffiliate,
      affiliates_paid: distributions.length,
      distributions
    });

  } catch (error) {
    console.error('Distribute Secret Santa error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

