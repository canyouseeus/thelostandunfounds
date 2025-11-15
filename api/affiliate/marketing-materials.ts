import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get marketing materials for affiliates
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.query;

    let query = supabase
      .from('marketing_materials')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (type && typeof type === 'string') {
      query = query.eq('material_type', type);
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Error fetching marketing materials:', error);
      return res.status(500).json({ error: 'Failed to fetch marketing materials' });
    }

    return res.status(200).json({
      success: true,
      materials: materials || [],
    });
  } catch (error) {
    console.error('Marketing materials error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
