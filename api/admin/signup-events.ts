/**
 * Admin-only view of recent signup attempts (success and failure), backed
 * by the signup_events table. Lets us answer "did anyone's signup fail
 * around date X" without dashboard/Postgres access.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdmin(req: VercelRequest): boolean {
  const email = (req.headers['x-admin-email'] as string || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;
  const host = req.headers.host || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

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
