/**
 * Affiliate Setup API
 * Allows users to create their affiliate account with a custom code
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendAffiliateEmail } from './_emails.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env vars at runtime, not module load time
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables for affiliate setup');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { user_id, code } = req.body;

  if (!user_id || !code) {
    return res.status(400).json({ error: 'User ID and code are required' });
  }

  try {
    // Validate code format
    const codeRegex = /^[A-Z0-9]{4,12}$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        error: 'Code must be 4-12 uppercase letters/numbers only'
      });
    }

    // Reserved codes that cannot be used
    const reservedCodes = ['ADMIN', 'TEST', 'SYSTEM', 'API', 'NULL', 'UNDEFINED'];
    if (reservedCodes.includes(code)) {
      return res.status(400).json({
        error: 'This code is reserved and cannot be used'
      });
    }

    // Check if user already has an affiliate account
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id, code')
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'You already have an affiliate account',
        code: existing.code
      });
    }

    // Check if code is already taken
    const { data: codeCheck } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .single();

    if (codeCheck) {
      return res.status(400).json({
        error: 'This code is already taken. Please choose another.'
      });
    }

    // Create affiliate account
    const { data: affiliate, error: createError } = await supabase
      .from('affiliates')
      .insert({
        user_id,
        code,
        status: 'active',
        commission_rate: 42.00,
        total_earnings: 0,
        total_clicks: 0,
        total_conversions: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating affiliate:', createError);
      return res.status(500).json({ error: 'Failed to create affiliate account' });
    }

    // Payout settings are now created/owned by the Stripe Connect onboarding
    // flow (POST /api/affiliates/connect-onboarding), which writes the
    // stripe_account_id once Stripe issues one. We deliberately do NOT
    // create a payout_settings row here — there is nothing to put in it
    // until the user completes Stripe Connect KYC.

    // Best-effort welcome email (deduped on affiliate id)
    try {
      const { data: userRow } = await supabase.auth.admin.getUserById(user_id);
      const recipient = userRow?.user?.email;
      if (recipient) {
        await sendAffiliateEmail({
          type: 'welcome',
          affiliateId: affiliate.id,
          referenceId: affiliate.id,
          to: recipient,
          data: { code },
        });
      }
    } catch (emailErr: any) {
      console.warn('[affiliate-setup] welcome email failed:', emailErr?.message);
    }

    return res.status(200).json({
      success: true,
      affiliate,
      message: 'Affiliate account created successfully!',
    });
  } catch (error) {
    console.error('Affiliate setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


