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

  // Require admin secret key for security
  const adminSecret = process.env.ADMIN_SECRET_KEY || process.env.RESET_NEWSLETTER_SECRET
  const providedSecret = req.headers['x-admin-secret'] || req.body.secret

  if (!adminSecret || providedSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized: Admin secret required' })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ 
        error: 'Database service not configured' 
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

    // Delete all subscribers
    // Using service role key allows deletion without RLS restrictions
    // Match all rows by using a condition that's always true (email is required, so this matches all)
    const { error: deleteError } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .neq('email', '') // Matches all rows since email is required and not empty

    if (deleteError) {
      console.error('Error deleting subscribers:', deleteError)
      return res.status(500).json({ 
        error: 'Failed to reset newsletter list',
        details: deleteError.message 
      })
    }

    // Verify deletion
    const { count: afterCount } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })

    return res.status(200).json({ 
      success: true,
      message: 'Newsletter subscribers list reset successfully',
      deleted: beforeCount || 0,
      remaining: afterCount || 0
    })

  } catch (error: any) {
    console.error('Reset newsletter list error:', error)
    return res.status(500).json({ 
      error: error.message || 'An error occurred while resetting the list' 
    })
  }
}
