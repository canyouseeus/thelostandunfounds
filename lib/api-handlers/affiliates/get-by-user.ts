/**
 * Get Affiliate by User ID
 * Returns the affiliate account for a given user, or null if not found
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for get-by-user');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const userId = req.query.user_id as string;

  if (!userId) {
    return res.status(400).json({ error: 'user_id query param is required' });
  }

  try {
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (not an error, just means user isn't an affiliate yet)
      console.error('Error fetching affiliate:', error);
      return res.status(500).json({ error: 'Failed to fetch affiliate' });
    }

    if (!affiliate) {
      return res.status(200).json({
        affiliate: null,
        isAffiliate: false,
        message: 'User is not an affiliate yet'
      });
    }

    return res.status(200).json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.code || affiliate.affiliate_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
        total_earnings: affiliate.total_earnings || 0,
        total_clicks: affiliate.total_clicks || 0,
        total_conversions: affiliate.total_conversions || 0,
        reward_points: affiliate.reward_points || 0,
        discount_credit_balance: affiliate.discount_credit_balance || 0,
        total_mlm_earnings: affiliate.total_mlm_earnings || 0,
        commission_mode: affiliate.commission_mode || 'cash',
        created_at: affiliate.created_at,
      },
      isAffiliate: true
    });
  } catch (error: any) {
    console.error('Get affiliate by user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
