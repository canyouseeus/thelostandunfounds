import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Add cost to a subscription for commission calculations
 * This should be called by an admin or automated system
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Add admin authentication check here
    const { subscription_id, cost_type, amount, description, period_start, period_end } = req.body;

    if (!subscription_id || !cost_type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Subscription ID, cost type, and positive amount are required' });
    }

    // Insert cost record
    const { data: cost, error: insertError } = await supabase
      .from('subscription_costs')
      .insert({
        subscription_id,
        cost_type,
        amount: parseFloat(amount.toString()),
        description,
        period_start: period_start || new Date().toISOString(),
        period_end: period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding cost:', insertError);
      return res.status(500).json({ error: 'Failed to add cost' });
    }

    return res.status(200).json({
      success: true,
      cost,
    });
  } catch (error) {
    console.error('Add cost error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
