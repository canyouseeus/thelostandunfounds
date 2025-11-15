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

    const { paypal_email } = req.body;

    if (!paypal_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal_email)) {
      return res.status(400).json({ error: 'Valid PayPal email is required' });
    }

    // Update affiliate PayPal email
    const { data: affiliate, error: updateError } = await supabase
      .from('affiliates')
      .update({ paypal_email })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating PayPal email:', updateError);
      return res.status(500).json({ error: 'Failed to update PayPal email' });
    }

    return res.status(200).json({
      success: true,
      paypal_email: affiliate.paypal_email,
    });
  } catch (error) {
    console.error('Update PayPal email error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
