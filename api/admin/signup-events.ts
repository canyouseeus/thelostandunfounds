import { getAdminUser } from '../../lib/api-handlers/_admin-auth.js'
/**
 * Admin-only view of recent signup attempts (success and failure), backed
 * by the signup_events table. Lets us answer "did anyone's signup fail
 * around date X" without dashboard/Postgres access.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';


async function isAdmin(req: VercelRequest): Promise<boolean> {
    // Verifies a real Supabase session; never trusts a header as identity.
    return (await getAdminUser(req)) !== null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await isAdmin(req))) return res.status(403).json({ error: 'Admin access required' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase service role configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const onlyFailures = req.query.failuresOnly === 'true';
  const since = req.query.since ? new Date(Number(req.query.since)).toISOString() : null;

  let query = supabase
    .from('signup_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (onlyFailures) query = query.eq('success', false);
  if (since) query = query.gte('created_at', since);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ events: data });
}
