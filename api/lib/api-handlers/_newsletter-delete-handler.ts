/**
 * Newsletter Campaign Delete Handler
 * Secure server-side deletion using service role key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Admin emails that are allowed to delete campaigns
const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdminRequest(req: VercelRequest): boolean {
  const adminEmail = req.headers['x-admin-email'] as string
  
  if (adminEmail && ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
    return true
  }
  
  // Also accept requests from localhost in development
  const host = req.headers.host || ''
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true
  }
  
  return false
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST/DELETE requests
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Admin check
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { campaignIds } = req.body

  if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
    return res.status(400).json({ error: 'campaignIds array is required' })
  }

  try {
    // Use service role key for admin operations (bypasses RLS)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Delete campaigns (send_logs will cascade delete due to FK)
    const { error, count } = await supabase
      .from('newsletter_campaigns')
      .delete()
      .in('id', campaignIds)

    if (error) {
      console.error('Error deleting campaigns:', error)
      throw error
    }

    return res.status(200).json({
      success: true,
      message: `${count || campaignIds.length} campaign(s) deleted`,
      deletedCount: count || campaignIds.length
    })

  } catch (error: any) {
    console.error('Newsletter delete error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while deleting campaigns',
    })
  }
}
