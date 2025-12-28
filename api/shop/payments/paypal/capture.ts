import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Capture PayPal Payment
 * Called after user approves payment on PayPal
 * Captures the payment and calculates affiliate commission
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { orderId } = req.body

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' })
    }

    console.log('💰 Capturing PayPal order:', orderId)

    // First, capture the PayPal order via PayPal API
    const environment = (process.env.PAYPAL_ENVIRONMENT || '').toUpperCase()
    const isSandbox = environment !== 'LIVE' // default to SANDBOX unless explicitly LIVE
    const clientId = isSandbox
      ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
      : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
    const clientSecret = isSandbox
      ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
      : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
    const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com'

    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials missing')
      return res.status(500).json({ error: 'PayPal credentials not configured' })
    }

    // Get access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('❌ Failed to get PayPal access token')
      return res.status(500).json({ error: 'Failed to authenticate with PayPal' })
    }

    // Capture the order
    console.log('📤 Capturing order via PayPal API:', orderId)
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json().catch(() => ({}))
      console.error('❌ PayPal capture error:', errorData)
      return res.status(500).json({ error: 'Failed to capture PayPal order', details: errorData })
    }

    const captureData = await captureResponse.json()
    console.log('✅ PayPal order captured:', captureData.id)

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get pending commission for this order
    // Try exact match first
    let { data: commission, error: commissionError } = await supabase
      .from('affiliate_commissions')
      .select('*, affiliates!inner(code)')
      .eq('order_id', orderId)
      .eq('source', 'paypal')
      .eq('status', 'pending')
      .single()

    // If not found, try without status filter (might already be approved)
    if (commissionError || !commission) {
      console.warn('⚠️ No pending commission found, checking all commissions for order:', orderId)
      const { data: allCommissions } = await supabase
        .from('affiliate_commissions')
        .select('*, affiliates!inner(code)')
        .eq('order_id', orderId)
        .eq('source', 'paypal')
      
      if (allCommissions && allCommissions.length > 0) {
        const existingCommission = allCommissions[0]
        console.log(`ℹ️ Commission found with status: ${existingCommission.status}`)
        if (existingCommission.status === 'approved') {
          return res.status(200).json({ 
            success: true, 
            message: 'Payment captured (commission already approved)',
            commission: {
              amount: existingCommission.amount,
              affiliateCode: existingCommission.affiliates?.code,
              status: existingCommission.status
            }
          })
        }
        // Use the existing commission even if not pending
        commission = existingCommission
        commissionError = null
      }
    }

    if (commissionError || !commission) {
      console.warn('⚠️ No commission found for order:', orderId, {
        error: commissionError?.message,
        code: commissionError?.code
      })
      // Still return success - payment was captured, just no affiliate tracking
      return res.status(200).json({ success: true, message: 'Payment captured (no affiliate commission)' })
    }

    console.log('📋 Found commission to approve:', {
      commissionId: commission.id,
      affiliateCode: commission.affiliates?.code,
      amount: commission.amount,
      currentStatus: commission.status
    })

    // Update commission status to approved (only if still pending)
    if (commission.status === 'pending') {
      const { error: updateError } = await supabase
        .from('affiliate_commissions')
        .update({ status: 'approved' })
        .eq('id', commission.id)

      if (updateError) {
        console.error('❌ Error updating commission status:', updateError)
        return res.status(500).json({ 
          error: 'Failed to update commission status', 
          details: updateError.message 
        })
      }
      console.log('✅ Commission status updated to approved')
    } else {
      console.log(`ℹ️ Commission already has status: ${commission.status}, skipping status update`)
    }

    // Update affiliate totals (only if commission was just approved)
    if (commission.status === 'pending' || !commission.status) {
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('total_earnings, total_conversions')
        .eq('id', commission.affiliate_id)
        .single()

      if (affiliateError) {
        console.error('❌ Error fetching affiliate:', affiliateError)
      } else if (affiliate) {
        const currentEarnings = parseFloat(affiliate.total_earnings || '0')
        const commissionAmount = parseFloat(commission.amount.toString())
        const newEarnings = (currentEarnings + commissionAmount).toFixed(2)
        const currentConversions = parseInt(affiliate.total_conversions || '0')
        const newConversions = currentConversions + 1

        console.log('💰 Updating affiliate totals:', {
          affiliateId: commission.affiliate_id,
          currentEarnings,
          commissionAmount,
          newEarnings,
          currentConversions,
          newConversions
        })

        const { error: updateAffiliateError } = await supabase
          .from('affiliates')
          .update({
            total_earnings: newEarnings,
            total_conversions: newConversions,
          })
          .eq('id', commission.affiliate_id)

        if (updateAffiliateError) {
          console.error('❌ Error updating affiliate totals:', updateAffiliateError)
          // Don't fail the request - commission is approved, totals can be fixed manually
        } else {
          console.log('✅ Affiliate totals updated successfully')
        }
      }
    }

    console.log('✅ Commission approved for affiliate:', commission.affiliates?.code)

    return res.status(200).json({
      success: true,
      commission: {
        amount: commission.amount,
        affiliateCode: commission.affiliates.code,
      },
    })
  } catch (error: any) {
    console.error('Error capturing payment:', error)
    return res.status(500).json({ error: 'Payment capture failed', details: error.message })
  }
}

