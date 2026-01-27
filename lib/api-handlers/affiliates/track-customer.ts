import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Track a customer for an affiliate (lifetime tie)
 * POST /api/affiliates/track-customer
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, user_id, affiliate_code } = req.body;

    if (!email || !affiliate_code) {
      return res.status(400).json({ error: 'Email and affiliate_code required' });
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('affiliate_customers')
      .select('*, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(affiliate_code)')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      // Customer already tracked - return existing affiliate
      return res.status(200).json({
        success: true,
        existing: true,
        customer: existingCustomer,
        message: `Customer already tied to affiliate ${existingCustomer.affiliates?.affiliate_code}`
      });
    }

    // Find the affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, affiliate_code')
      .eq('affiliate_code', affiliate_code)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Create lifetime customer tie
    const { data: newCustomer, error: createError } = await supabase
      .from('affiliate_customers')
      .insert({
        email,
        user_id: user_id || null,
        referred_by_affiliate_id: affiliate.id
      })
      .select('*, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(affiliate_code)')
      .single();

    if (createError) {
      console.error('Error creating customer tie:', createError);
      return res.status(500).json({ error: 'Failed to create customer tie' });
    }

    return res.status(201).json({
      success: true,
      existing: false,
      customer: newCustomer,
      message: `Customer tied to affiliate ${affiliate.affiliate_code} forever`
    });

  } catch (error) {
    console.error('Track customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


