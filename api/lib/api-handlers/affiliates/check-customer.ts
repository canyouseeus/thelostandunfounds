import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Check if customer is tied to an affiliate
 * GET /api/affiliates/check-customer?email=xxx
 * Returns referring affiliate if exists
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for check-customer');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, user_id } = req.query;

    if (!email && !user_id) {
      return res.status(400).json({ error: 'Email or user_id required' });
    }

    let query = supabase
      .from('affiliate_customers')
      .select(`
        *,
        affiliates!affiliate_customers_referred_by_affiliate_id_fkey(
          id,
          affiliate_code,
          commission_mode,
          commission_rate
        )
      `);

    if (email) {
      query = query.eq('email', email as string);
    } else if (user_id) {
      query = query.eq('user_id', user_id as string);
    }

    const { data: customer, error } = await query.single();

    if (error || !customer) {
      return res.status(200).json({
        found: false,
        customer: null,
        affiliate: null
      });
    }

    return res.status(200).json({
      found: true,
      customer: {
        email: customer.email,
        first_purchase_date: customer.first_purchase_date,
        total_purchases: customer.total_purchases,
        total_profit_generated: customer.total_profit_generated
      },
      affiliate: customer.affiliates
    });

  } catch (error) {
    console.error('Check customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


