import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Generate or get discount code for affiliate
 * POST /api/affiliates/generate-discount
 * Body: { affiliate_id: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { affiliate_id } = req.body;

    if (!affiliate_id) {
      return res.status(400).json({ error: 'affiliate_id required' });
    }

    // Get affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Check if discount code already exists
    const { data: existingCode } = await supabase
      .from('affiliate_discount_codes')
      .select('*')
      .eq('affiliate_id', affiliate_id)
      .single();

    if (existingCode) {
      return res.status(200).json({
        success: true,
        code: existingCode.code,
        discount_percent: existingCode.discount_percent,
        is_active: existingCode.is_active,
        existing: true
      });
    }

    // Generate new code (always active - affiliates can use once per 30 days)
    const code = `${affiliate.affiliate_code}-EMPLOYEE`;

    const { data: newCode, error: createError } = await supabase
      .from('affiliate_discount_codes')
      .insert({
        affiliate_id,
        code,
        discount_percent: 42.00,
        is_active: true // Always active - usage is controlled by last_discount_use_date
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating discount code:', createError);
      return res.status(500).json({ error: 'Failed to create discount code' });
    }

    return res.status(201).json({
      success: true,
      code: newCode.code,
      discount_percent: newCode.discount_percent,
      is_active: newCode.is_active,
      existing: false
    });

  } catch (error) {
    console.error('Generate discount error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

