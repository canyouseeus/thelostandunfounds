/**
 * Signup telemetry sink.
 *
 * Records every signup attempt (success or failure) so a report like
 * "I tried to sign up and it didn't work" is diagnosable after the fact.
 * Fire-and-forget from the client — never let a logging failure surface
 * to the user or block the auth flow.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VALID_STAGES = new Set([
  'email_signup',
  'email_autosignin',
  'google_oauth_start',
  'google_oauth_callback',
  'affiliate_setup',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // Never break the caller's auth flow over a missing env var here.
    return res.status(200).json({ logged: false });
  }

  const { stage, method, success, email, intent, path, error_message } = req.body || {};

  if (typeof stage !== 'string' || !VALID_STAGES.has(stage) || typeof success !== 'boolean') {
    return res.status(400).json({ error: 'Invalid event payload' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const forwardedFor = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim();

  try {
    const { error } = await supabase.from('signup_events').insert({
      stage,
      method: typeof method === 'string' ? method.slice(0, 32) : null,
      success,
      email: typeof email === 'string' ? email.slice(0, 320).toLowerCase() : null,
      intent: typeof intent === 'string' ? intent.slice(0, 64) : null,
      path: typeof path === 'string' ? path.slice(0, 256) : null,
      error_message: typeof error_message === 'string' ? error_message.slice(0, 1000) : null,
      user_agent: (req.headers['user-agent'] as string || '').slice(0, 512),
      ip_address: forwardedFor || null,
    });

    if (error) {
      console.error('[log-signup-event] insert failed:', error.message);
      return res.status(200).json({ logged: false });
    }

    return res.status(200).json({ logged: true });
  } catch (err: any) {
    console.error('[log-signup-event] unexpected error:', err?.message);
    return res.status(200).json({ logged: false });
  }
}
