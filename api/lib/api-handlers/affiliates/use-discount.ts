import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Check affiliate employee discount availability
 * GET /api/affiliates/use-discount?affiliate_id=xxx
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

    // Get affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('last_discount_use_date')
      .eq('id', affiliate_id as string)
      .single();

    if (affiliateError) {
      console.error('Supabase error in use-discount:', affiliateError);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Check if they can use discount
    if (!affiliate.last_discount_use_date) {
      return res.status(200).json({
        can_use: true,
        days_remaining: 0,
        next_available: null,
        message: 'Discount available - you can use it now!'
      });
    }

    const lastUse = new Date(affiliate.last_discount_use_date);
    const daysSince = Math.floor((Date.now() - lastUse.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysSince);
    const canUse = daysSince >= 30;

    const nextAvailable = canUse
      ? null
      : new Date(lastUse.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return res.status(200).json({
      can_use: canUse,
      days_remaining: daysRemaining,
      next_available: nextAvailable,
      last_used: affiliate.last_discount_use_date,
      message: canUse
        ? 'Discount available - you can use it now!'
        : `Discount resets in ${daysRemaining} days`
    });

  } catch (error) {
    console.error('Check discount usage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


