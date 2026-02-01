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
    const { affiliateCode, metadata } = req.body
    console.log('📥 Received affiliate click tracking request:', { affiliateCode, method: req.method })

    if (!affiliateCode || typeof affiliateCode !== 'string') {
      console.warn('⚠️ Invalid affiliateCode:', affiliateCode)
      return res.status(400).json({ error: 'affiliateCode is required' })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client initialized')

    // Find affiliate by code (try both 'code' and 'affiliate_code' columns)
    let affiliate = null
    let affiliateError = null

    // Try 'code' column first (case-insensitive)
    console.log(`🔍 Searching for affiliate with code: ${affiliateCode}`)
    const { data: affiliateByCode, error: errorByCode } = await supabase
      .from('affiliates')
      .select('id')
      .ilike('code', affiliateCode)
      .eq('status', 'active')
      .maybeSingle()

    if (affiliateByCode && !errorByCode) {
      affiliate = affiliateByCode
      console.log('✅ Found affiliate by "code" column:', affiliate.id)
    } else {
      console.log('⚠️ Not found by "code" column, trying "affiliate_code"...', errorByCode?.message)
      // Try 'affiliate_code' column as fallback (case-insensitive)
      const { data: affiliateByAffiliateCode, error: errorByAffiliateCode } = await supabase
        .from('affiliates')
        .select('id')
        .ilike('affiliate_code', affiliateCode)
        .eq('status', 'active')
        .maybeSingle()

      if (affiliateByAffiliateCode && !errorByAffiliateCode) {
        affiliate = affiliateByAffiliateCode
        console.log('✅ Found affiliate by "affiliate_code" column:', affiliate.id)
      } else {
        affiliateError = errorByAffiliateCode || errorByCode
        console.warn('❌ Affiliate not found by either column:', {
          codeError: errorByCode?.message,
          affiliateCodeError: errorByAffiliateCode?.message
        })
      }
    }

    if (affiliateError || !affiliate) {
      console.warn(`⚠️ Affiliate not found or inactive: ${affiliateCode}`, affiliateError)
      // Don't return error - just log and return success to not break user flow
      return res.status(200).json({ success: true, message: 'Affiliate not found' })
    }

    // Call SQL function to increment clicks
    console.log(`📊 Calling increment_affiliate_clicks for affiliate: ${affiliate.id}`)
    const { error: functionError } = await supabase.rpc('increment_affiliate_clicks', {
      affiliate_id: affiliate.id
    })

    if (functionError) {
      console.error('❌ Error incrementing affiliate clicks:', functionError)
      // Still return success to not break user flow
      return res.status(200).json({ success: true, message: 'Click tracking failed' })
    }

    // Log detailed click event (for Sub-ID/Campaign tracking)
    try {
      const userAgent = req.headers['user-agent'] || null
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null

      const { error: eventLogError } = await supabase
        .from('affiliate_click_events')
        .insert({
          affiliate_id: affiliate.id,
          metadata: metadata || {},
          user_agent: userAgent,
          ip_address: ipAddress
        })

      if (eventLogError) {
        // Just warn, don't fail the request (table might not exist yet)
        console.warn('⚠️ Failed to log affiliate click event (check if affiliate_click_events table exists):', eventLogError.message)
      } else {
        console.log('📝 Logged affiliate click event with metadata')
      }
    } catch (err) {
      console.warn('⚠️ Error logging affiliate click event:', err)
    }

    console.log('✅ Successfully incremented clicks for affiliate:', affiliate.id)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error tracking affiliate click:', error)
    // Return success even on error to not break user experience
    return res.status(200).json({ success: true, error: 'Tracking failed' })
  }
}

