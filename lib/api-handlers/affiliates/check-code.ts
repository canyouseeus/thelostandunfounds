/**
 * Check Affiliate Code Availability
 * Returns whether a given code is available for use
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Reserved codes that cannot be used
const RESERVED_CODES = ['ADMIN', 'TEST', 'SYSTEM', 'API', 'NULL', 'UNDEFINED', 'ROOT', 'OWNER'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = (req.query.code as string)?.toUpperCase().trim();

  if (!code) {
    return res.status(400).json({ error: 'code query param is required' });
  }

  // Validate code format
  const codeRegex = /^[A-Z0-9]{4,12}$/;
  if (!codeRegex.test(code)) {
    return res.status(400).json({ 
      available: false,
      error: 'Code must be 4-12 uppercase letters/numbers only'
    });
  }

  // Check reserved codes
  if (RESERVED_CODES.includes(code)) {
    return res.status(200).json({ 
      available: false,
      reason: 'reserved'
    });
  }

  try {
    // Check if code exists in affiliates table
    const { data: existing, error } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', code)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (which means code is available)
      console.error('Error checking code:', error);
      return res.status(500).json({ error: 'Failed to check code availability' });
    }

    return res.status(200).json({
      code,
      available: !existing,
      reason: existing ? 'taken' : null
    });
  } catch (error: any) {
    console.error('Check code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
