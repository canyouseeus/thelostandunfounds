/**
 * Newsletter Campaign Delete Handler
 * Secure server-side deletion using service role key
 */

import { getAdminUser } from './_admin-auth.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Admin emails that are allowed to delete campaigns

async function isAdminRequest(req: VercelRequest): Promise<boolean> {
  // Verifies a real Supabase session; never trusts a header as identity.
  return (await getAdminUser(req)) !== null
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
  if (!await isAdminRequest(req)) {
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
