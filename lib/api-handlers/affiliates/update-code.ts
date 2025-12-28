/**
 * Update Affiliate Code API
 * Allows users to update their affiliate code (with validation)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, new_code } = req.body;

  if (!user_id || !new_code) {
    return res.status(400).json({ error: 'User ID and new code are required' });
  }

  try {
    // Validate code format
    const codeRegex = /^[A-Z0-9]{4,12}$/;
    if (!codeRegex.test(new_code)) {
      return res.status(400).json({ 
        error: 'Code must be 4-12 uppercase letters/numbers only' 
      });
    }

    // Reserved codes that cannot be used
    const reservedCodes = ['ADMIN', 'TEST', 'SYSTEM', 'API', 'NULL', 'UNDEFINED'];
    if (reservedCodes.includes(new_code)) {
      return res.status(400).json({ 
        error: 'This code is reserved and cannot be used' 
      });
    }

    // Get current affiliate account
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, code')
      .eq('user_id', user_id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Affiliate account not found' });
    }

    // Check if code is the same (no change needed)
    if (affiliate.code === new_code) {
      return res.status(400).json({ 
        error: 'This is already your affiliate code' 
      });
    }

    // Check if new code is already taken by another affiliate
    const { data: codeCheck } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', new_code)
      .neq('id', affiliate.id)
      .single();

    if (codeCheck) {
      return res.status(400).json({ 
        error: 'This code is already taken. Please choose another.' 
      });
    }

    // Update affiliate code
    const { data: updatedAffiliate, error: updateError } = await supabase
      .from('affiliates')
      .update({
        code: new_code,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating affiliate code:', updateError);
      return res.status(500).json({ error: 'Failed to update affiliate code' });
    }

    return res.status(200).json({
      success: true,
      affiliate: updatedAffiliate,
      message: 'Affiliate code updated successfully!',
    });
  } catch (error) {
    console.error('Update affiliate code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


