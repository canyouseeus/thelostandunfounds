import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin update affiliate details (rate, threshold, PayPal email, status)
 * POST /api/admin/update-affiliate
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { affiliateId, commission_rate, payment_threshold, paypal_email, status } = req.body || {};

  if (!affiliateId) {
    return res.status(400).json({ error: 'affiliateId is required' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Database service not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const update: Record<string, any> = {};
    if (commission_rate !== undefined) update.commission_rate = commission_rate;
    if (payment_threshold !== undefined) update.payment_threshold = payment_threshold;
    if (paypal_email !== undefined) update.paypal_email = paypal_email;
    if (status !== undefined) update.status = status;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const { data, error } = await supabase
      .from('affiliates')
      .update(update)
      .eq('id', affiliateId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Update affiliate error:', error);
      return res.status(500).json({ error: 'Failed to update affiliate', details: error.message });
    }

    return res.status(200).json({ success: true, affiliate: data });
  } catch (error: any) {
    console.error('Admin update affiliate API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

