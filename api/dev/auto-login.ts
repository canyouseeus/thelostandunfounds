/**
 * Dev-only auto-login endpoint
 *
 * Generates an admin session using the service role key.
 * Only works in development (non-production) environments.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'thelostandunfounds@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Block in production
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase service role configuration' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Find existing admin user
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    let adminUser = users.find(u => u.email === ADMIN_EMAIL);

    if (!adminUser) {
      // Create the admin user if it doesn't exist
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: ADMIN_EMAIL,
        email_confirm: true,
        user_metadata: { role: 'admin', is_admin: true, author_name: 'Admin' },
      });
      if (createError) throw createError;
      adminUser = created.user;
    }

    // Generate a magic link and extract the token
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: ADMIN_EMAIL,
    });
    if (linkError) throw linkError;

    // Use the hashed token to verify and create a session
    const { data: sessionData, error: verifyError } = await adminClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    if (verifyError) throw verifyError;

    if (!sessionData.session) {
      throw new Error('Failed to create session');
    }

    return res.status(200).json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      user: sessionData.session.user,
    });
  } catch (error: any) {
    console.error('Dev auto-login error:', error);
    return res.status(500).json({ error: error.message || 'Auto-login failed' });
  }
}
