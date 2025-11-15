import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is already an affiliate
    const { data: existingAffiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingAffiliate) {
      return res.status(400).json({ error: 'User is already registered as an affiliate' });
    }

    // Generate unique referral code
    const { data: codeData, error: codeError } = await supabase.rpc('generate_referral_code');
    
    if (codeError) {
      console.error('Error generating referral code:', codeError);
      return res.status(500).json({ error: 'Failed to generate referral code' });
    }

    const referralCode = codeData || `AFF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create affiliate record
    const { data: affiliate, error: insertError } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        referral_code: referralCode,
        status: 'active',
        commission_rate: 50.00, // 50% default
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating affiliate:', insertError);
      return res.status(500).json({ error: 'Failed to register as affiliate' });
    }

    return res.status(200).json({
      success: true,
      affiliate: {
        id: affiliate.id,
        referral_code: affiliate.referral_code,
        status: affiliate.status,
        commission_rate: affiliate.commission_rate,
      },
    });
  } catch (error) {
    console.error('Affiliate registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
