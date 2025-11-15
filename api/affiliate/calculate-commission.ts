import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Calculate and create commission when a subscription is created/renewed
 * Called after a successful subscription payment
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription_id, user_id, tier, revenue, period_start, period_end } = req.body;

    if (!subscription_id || !user_id || !tier || !revenue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find if user was referred
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, affiliate_id, converted')
      .eq('referred_user_id', user_id)
      .maybeSingle();

    if (!referral) {
      // User wasn't referred - no commission
      return res.status(200).json({ success: true, message: 'No referral found' });
    }

    // Get affiliate info
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, commission_rate, status')
      .eq('id', referral.affiliate_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!affiliate) {
      return res.status(200).json({ success: true, message: 'Affiliate not found or inactive' });
    }

    // Calculate total costs for this subscription period
    const { data: costs } = await supabase
      .from('subscription_costs')
      .select('amount')
      .eq('subscription_id', subscription_id)
      .gte('period_start', period_start)
      .lte('period_end', period_end);

    const totalCosts = costs?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

    // Calculate profit and commission
    const profit = parseFloat(revenue.toString()) - totalCosts;
    const commissionAmount = (profit * parseFloat(affiliate.commission_rate.toString())) / 100;

    // Only create commission if profit is positive
    if (profit <= 0 || commissionAmount <= 0) {
      return res.status(200).json({
        success: true,
        message: 'No commission - profit is zero or negative',
        profit,
        commission_amount: 0,
      });
    }

    // Mark referral as converted if not already
    if (!referral.converted) {
      await supabase
        .from('referrals')
        .update({
          converted: true,
          conversion_date: new Date().toISOString(),
        })
        .eq('id', referral.id);
    }

    // Create commission record
    const { data: commission, error: commissionError } = await supabase
      .from('commissions')
      .insert({
        affiliate_id: affiliate.id,
        referral_id: referral.id,
        subscription_id,
        revenue: parseFloat(revenue.toString()),
        costs: totalCosts,
        profit,
        commission_rate: affiliate.commission_rate,
        commission_amount: commissionAmount,
        status: 'pending',
        period_start,
        period_end: period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days if not provided
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Error creating commission:', commissionError);
      return res.status(500).json({ error: 'Failed to create commission' });
    }

    return res.status(200).json({
      success: true,
      commission: {
        id: commission.id,
        commission_amount: commission.commission_amount,
        profit,
        revenue: parseFloat(revenue.toString()),
        costs: totalCosts,
      },
    });
  } catch (error) {
    console.error('Calculate commission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
