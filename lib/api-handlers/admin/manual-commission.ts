import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin manual commission adjustment
 * POST /api/admin/manual-commission
 * Body: { affiliateId?, affiliateCode?, amount, status?, source?, profit_generated?, product_cost? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { affiliateId, affiliateCode, amount, status = 'approved', source = 'manual', profit_generated, product_cost } =
    req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be greater than 0' });
  }

  if (!affiliateId && !affiliateCode) {
    return res.status(400).json({ error: 'affiliateId or affiliateCode is required' });
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

    let resolvedAffiliateId = affiliateId;
    if (!resolvedAffiliateId && affiliateCode) {
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id')
        .eq('code', affiliateCode)
        .maybeSingle();

      if (affiliateError) {
        return res.status(500).json({ error: 'Failed to resolve affiliate', details: affiliateError.message });
      }
      if (!affiliate) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }
      resolvedAffiliateId = affiliate.id;
    }

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_id: resolvedAffiliateId,
        amount,
        profit_generated: profit_generated ?? null,
        product_cost: product_cost ?? null,
        status,
        source,
        order_id: null,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Manual commission insert error:', error);
      return res.status(500).json({ error: 'Failed to create manual commission', details: error.message });
    }

    return res.status(200).json({ success: true, commission: data });
  } catch (error: any) {
    console.error('Admin manual commission API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

