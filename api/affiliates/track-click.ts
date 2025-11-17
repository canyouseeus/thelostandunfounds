import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { affiliateCode } = req.body

    if (!affiliateCode || typeof affiliateCode !== 'string') {
      return res.status(400).json({ error: 'affiliateCode is required' })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('code', affiliateCode)
      .eq('status', 'active')
      .single()

    if (affiliateError || !affiliate) {
      console.warn(`Affiliate not found or inactive: ${affiliateCode}`, affiliateError)
      // Don't return error - just log and return success to not break user flow
      return res.status(200).json({ success: true, message: 'Affiliate not found' })
    }

    // Call SQL function to increment clicks
    const { error: functionError } = await supabase.rpc('increment_affiliate_clicks', {
      affiliate_id: affiliate.id
    })

    if (functionError) {
      console.error('Error incrementing affiliate clicks:', functionError)
      // Still return success to not break user flow
      return res.status(200).json({ success: true, message: 'Click tracking failed' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error tracking affiliate click:', error)
    // Return success even on error to not break user experience
    return res.status(200).json({ success: true, error: 'Tracking failed' })
  }
}

