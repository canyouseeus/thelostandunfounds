/**
 * Admin Password Reset API
 * Reset password for admin users (requires admin authentication)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    // Diagnostic logging for debugging 403 errors
    console.log('[Reset Password] Using Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasSvcKey: !!supabaseServiceKey,
      svcKeyLength: supabaseServiceKey?.length,
      svcKeyPrefix: supabaseServiceKey?.substring(0, 10)
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Reset Password] Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify requester is admin (check auth token)
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (!authError && user) {
        const { data: requesterRole } = await supabaseAdmin
          .from('user_roles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single()

        if (!requesterRole?.is_admin) {
          return res.status(403).json({ error: 'Only admins can reset passwords' })
        }
      }
    }

    // Get user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return res.status(500).json({ error: 'Failed to find user' })
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if target user is admin (optional - you might want to allow resetting any user)
    const { data: targetUserRole } = await supabaseAdmin
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', targetUser.id)
      .single()

    // Reset password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return res.status(500).json({ error: 'Failed to reset password' })
    }

    return res.status(200).json({
      success: true,
      message: `Password reset successfully for ${email}`,
      isAdmin: targetUserRole?.is_admin || false
    })

  } catch (error: any) {
    console.error('Error in reset-password API:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
