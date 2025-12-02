import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Main commission calculator with employee discount adjustment
 * POST /api/affiliates/calculate-commission
 * Body: { 
 *   order_id: string,
 *   email: string,
 *   user_id?: string,
 *   profit: number,
 *   affiliate_code?: string (for first-time customers)
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order_id, email, user_id, profit, affiliate_code } = req.body;

    if (!order_id || !email || !profit) {
      return res.status(400).json({ error: 'order_id, email, and profit required' });
    }

    let adjustedProfit = profit;
    const breakdown: any = {
      original_profit: profit,
      employee_discount: 0,
      adjusted_profit: profit,
      affiliate_commission: 0,
      mlm_level1: 0,
      mlm_level2: 0,
      king_midas: 0,
      secret_santa: 0,
      company: 0
    };

    // STEP 1: Check if buyer is an affiliate using employee discount
    let buyerAffiliate = null;
    if (user_id) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user_id)
        .single();

      buyerAffiliate = affiliate;

      // Check if buyer used their employee discount code (not mode-based)
      // This is checked at checkout when discount code is validated
      // For now, we check if they're using discount by checking discount code usage
      // The discount code validation happens at checkout and sets a flag
      const usedDiscountCode = req.body.used_discount_code === true;
      
      if (affiliate && usedDiscountCode) {
        // Check if they can use discount (once per 30 days)
        const canUseDiscount = !affiliate.last_discount_use_date || 
          (() => {
            const lastUse = new Date(affiliate.last_discount_use_date);
            const daysSince = Math.floor((Date.now() - lastUse.getTime()) / (1000 * 60 * 60 * 24));
            return daysSince >= 30;
          })();

        if (canUseDiscount) {
          // Deduct employee discount FIRST
          const employeeDiscount = profit * 0.42;
          adjustedProfit = profit - employeeDiscount;
          breakdown.employee_discount = employeeDiscount;
          breakdown.adjusted_profit = adjustedProfit;

          // Update last discount use date
          await supabase
            .from('affiliates')
            .update({
              last_discount_use_date: new Date().toISOString().split('T')[0],
              discount_credit_balance: (affiliate.discount_credit_balance || 0) + employeeDiscount
            })
            .eq('id', affiliate.id);

        // Award points for self-purchase (partial based on amount paid)
        const selfPurchasePoints = Math.floor(adjustedProfit / 10);
        if (selfPurchasePoints > 0) {
          await supabase
            .from('reward_points_history')
            .insert({
              affiliate_id: affiliate.id,
              points: selfPurchasePoints,
              profit_amount: adjustedProfit,
              source: 'self_purchase',
              description: `Self-purchase: $${adjustedProfit.toFixed(2)} profit`
            });

          await supabase
            .from('affiliates')
            .update({
              reward_points: (affiliate.reward_points || 0) + selfPurchasePoints
            })
            .eq('id', affiliate.id);
        }
      }
    }

    // STEP 2: Find referring affiliate (lifetime customer tie OR new customer)
    let referringAffiliate = null;
    const { data: customer } = await supabase
      .from('affiliate_customers')
      .select('*, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(*)')
      .eq('email', email)
      .single();

    if (customer && customer.affiliates) {
      referringAffiliate = customer.affiliates;
      
      // Update customer stats
      await supabase
        .from('affiliate_customers')
        .update({
          total_purchases: (customer.total_purchases || 0) + 1,
          total_profit_generated: (parseFloat(customer.total_profit_generated || '0') + adjustedProfit).toFixed(2),
          first_purchase_date: customer.first_purchase_date || new Date().toISOString()
        })
        .eq('id', customer.id);

    } else if (affiliate_code) {
      // First-time customer with affiliate link
      const { data: newAffiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('affiliate_code', affiliate_code)
        .single();

      if (newAffiliate) {
        referringAffiliate = newAffiliate;

        // Create customer tie
        await supabase
          .from('affiliate_customers')
          .insert({
            email,
            user_id: user_id || null,
            referred_by_affiliate_id: newAffiliate.id,
            first_purchase_date: new Date().toISOString(),
            total_purchases: 1,
            total_profit_generated: adjustedProfit.toFixed(2)
          });
      }
    }

    // STEP 3: Pay referring affiliate 42% of adjusted profit
    let commissionId = null;
    if (referringAffiliate) {
      const commission = adjustedProfit * 0.42;
      breakdown.affiliate_commission = commission;

      const { data: commissionRecord } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: referringAffiliate.id,
          order_id,
          amount: commission,
          status: 'pending'
        })
        .select()
        .single();

      commissionId = commissionRecord?.id;

      // Update affiliate totals
      await supabase
        .from('affiliates')
        .update({
          total_earnings: (parseFloat(referringAffiliate.total_earnings || '0') + commission).toFixed(2)
        })
        .eq('id', referringAffiliate.id);

      // Award reward points (1 per $10 profit)
      const points = Math.floor(adjustedProfit / 10);
      if (points > 0) {
        await supabase
          .from('reward_points_history')
          .insert({
            affiliate_id: referringAffiliate.id,
            points,
            profit_amount: adjustedProfit,
            source: 'sale',
            commission_id: commissionId,
            description: `Sale: $${adjustedProfit.toFixed(2)} profit`
          });

        await supabase
          .from('affiliates')
          .update({
            reward_points: (referringAffiliate.reward_points || 0) + points
          })
          .eq('id', referringAffiliate.id);
      }
    }

    // STEP 4: Calculate MLM bonuses
    if (referringAffiliate && commissionId) {
      // Level 1 (2%)
      if (referringAffiliate.referred_by) {
        const level1Amount = adjustedProfit * 0.02;
        breakdown.mlm_level1 = level1Amount;

        await supabase
          .from('mlm_earnings')
          .insert({
            affiliate_id: referringAffiliate.referred_by,
            from_affiliate_id: referringAffiliate.id,
            commission_id: commissionId,
            level: 1,
            amount: level1Amount,
            profit_source: adjustedProfit
          });

        // Update total MLM earnings
        const { data: level1Affiliate } = await supabase
          .from('affiliates')
          .select('total_mlm_earnings')
          .eq('id', referringAffiliate.referred_by)
          .single();

        if (level1Affiliate) {
          await supabase
            .from('affiliates')
            .update({
              total_mlm_earnings: (parseFloat(level1Affiliate.total_mlm_earnings || '0') + level1Amount).toFixed(2)
            })
            .eq('id', referringAffiliate.referred_by);
        }

        // Level 2 (1%)
        const { data: level1Ref } = await supabase
          .from('affiliates')
          .select('referred_by')
          .eq('id', referringAffiliate.referred_by)
          .single();

        if (level1Ref && level1Ref.referred_by) {
          const level2Amount = adjustedProfit * 0.01;
          breakdown.mlm_level2 = level2Amount;

          await supabase
            .from('mlm_earnings')
            .insert({
              affiliate_id: level1Ref.referred_by,
              from_affiliate_id: referringAffiliate.id,
              commission_id: commissionId,
              level: 2,
              amount: level2Amount,
              profit_source: adjustedProfit
            });

          // Update total MLM earnings
          const { data: level2Affiliate } = await supabase
            .from('affiliates')
            .select('total_mlm_earnings')
            .eq('id', level1Ref.referred_by)
            .single();

          if (level2Affiliate) {
            await supabase
              .from('affiliates')
              .update({
                total_mlm_earnings: (parseFloat(level2Affiliate.total_mlm_earnings || '0') + level2Amount).toFixed(2)
              })
              .eq('id', level1Ref.referred_by);
          }
        } else {
          // No Level 2: add 1% to Secret Santa
          const secretSantaAmount = adjustedProfit * 0.01;
          breakdown.secret_santa += secretSantaAmount;
          await addToSecretSanta(secretSantaAmount, 'no_level_2', commissionId);
        }
      } else {
        // No Level 1: add 3% to Secret Santa
        const secretSantaAmount = adjustedProfit * 0.03;
        breakdown.secret_santa = secretSantaAmount;
        await addToSecretSanta(secretSantaAmount, 'no_referrer', commissionId);
      }
    } else if (!referringAffiliate) {
      // No referring affiliate: add 3% to Secret Santa
      const secretSantaAmount = adjustedProfit * 0.03;
      breakdown.secret_santa = secretSantaAmount;
      await addToSecretSanta(secretSantaAmount, 'no_referrer', null);
    }

    // STEP 5: King Midas pot (8%)
    breakdown.king_midas = adjustedProfit * 0.08;

    // STEP 6: Company gets the rest
    breakdown.company = adjustedProfit - breakdown.affiliate_commission - breakdown.mlm_level1 - breakdown.mlm_level2 - breakdown.king_midas - breakdown.secret_santa;

    return res.status(200).json({
      success: true,
      order_id,
      breakdown,
      referring_affiliate: referringAffiliate ? {
        id: referringAffiliate.id,
        code: referringAffiliate.affiliate_code
      } : null,
      buyer_is_affiliate: !!buyerAffiliate
    });

  } catch (error) {
    console.error('Calculate commission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addToSecretSanta(amount: number, reason: string, commissionId: string | null) {
  const currentYear = new Date().getFullYear();

  // Get or create current year pot
  const { data: pot } = await supabase
    .from('secret_santa_pot')
    .select('*')
    .eq('year', currentYear)
    .single();

  if (pot) {
    // Add contribution
    await supabase
      .from('secret_santa_contributions')
      .insert({
        pot_id: pot.id,
        commission_id: commissionId,
        amount,
        reason
      });

    // Update pot total
    await supabase
      .from('secret_santa_pot')
      .update({
        total_amount: (parseFloat(pot.total_amount || '0') + amount).toFixed(2)
      })
      .eq('id', pot.id);
  }
}

