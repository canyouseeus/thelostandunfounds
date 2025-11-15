import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Track a referral signup
 * Called when a user signs up with a referral code
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referral_code, user_id } = req.body;

    if (!referral_code || !user_id) {
      return res.status(400).json({ error: 'Referral code and user ID are required' });
    }

    // Find affiliate by referral code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, status')
      .eq('referral_code', referral_code.toUpperCase())
      .eq('status', 'active')
      .maybeSingle();

    if (affiliateError || !affiliate) {
      // Invalid referral code - silently fail (don't block signup)
      return res.status(200).json({ success: false, message: 'Invalid referral code' });
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('referred_user_id', user_id)
      .maybeSingle();

    if (existingReferral) {
      return res.status(200).json({ success: true, message: 'Referral already tracked' });
    }

    // Create referral record
    const { data: referral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user_id,
        referral_code: referral_code.toUpperCase(),
        converted: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating referral:', insertError);
      // Don't fail signup if referral tracking fails
      return res.status(200).json({ success: false, message: 'Failed to track referral' });
    }

    return res.status(200).json({
      success: true,
      referral_id: referral.id,
    });
  } catch (error) {
    console.error('Track referral error:', error);
    // Don't fail signup if referral tracking fails
    return res.status(200).json({ success: false, message: 'Failed to track referral' });
  }
}
