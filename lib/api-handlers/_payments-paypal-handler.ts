import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * PayPal Payment Handler
 * 
 * Creates PayPal orders with affiliate tracking
 * Handles both one-time payments and subscriptions
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, currency = 'USD', description, productId, variantId } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount is required and must be greater than 0' })
    }

    // Get affiliate reference from cookie/headers
    const affiliateRef = getAffiliateRefFromRequest(req)

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get product cost if productId provided
    let productCost = 0
    if (productId) {
      const { data: costData } = await supabase
        .from('product_costs')
        .select('cost')
        .eq('product_id', productId)
        .eq('variant_id', variantId || '')
        .eq('source', 'local')
        .single()

      productCost = costData?.cost || 0
    }

    // Create PayPal order using MCP PayPal server
    // Note: This assumes PayPal MCP server is available via servers/paypal/index.js
    const paypalOrder = await createPayPalOrder({
      amount,
      currency,
      description,
      affiliateRef,
      productId,
      productCost,
    })

    if (!paypalOrder || !paypalOrder.id) {
      return res.status(500).json({ error: 'Failed to create PayPal order' })
    }

    // Store order metadata in database for tracking
    if (affiliateRef) {
      // Find affiliate
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, commission_rate')
        .eq('code', affiliateRef)
        .eq('status', 'active')
        .single()

      if (affiliate) {
        // Store pending commission (will be finalized when payment completes)
        const profit = amount - productCost
        const commissionRate = affiliate.commission_rate / 100
        const commission = profit * commissionRate

        await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id: affiliate.id,
            order_id: paypalOrder.id,
            amount: commission,
            profit_generated: profit,
            source: 'paypal',
            product_cost: productCost,
            status: 'pending',
          })
      }
    }

    return res.status(200).json({
      success: true,
      orderId: paypalOrder.id,
      approvalUrl: paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href || paypalOrder.approvalUrl,
    })
  } catch (error) {
    console.error('Error creating PayPal payment:', error)
    return res.status(500).json({ error: 'Payment creation failed' })
  }
}

/**
 * Create PayPal order using direct PayPal API
 */
async function createPayPalOrder(params: {
  amount: number
  currency: string
  description?: string
  affiliateRef?: string | null
  productId?: string
  productCost?: number
}) {
  // Use direct PayPal API
  return await createPayPalOrderDirect(params)
}

/**
 * Fallback: Create PayPal order directly via API
 */
async function createPayPalOrderDirect(params: {
  amount: number
  currency: string
  description?: string
  affiliateRef?: string | null
  productId?: string
  productCost?: number
}) {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  const isSandbox = process.env.PAYPAL_ENVIRONMENT === 'sandbox'
  const baseUrl = isSandbox
    ? 'https://api.sandbox.paypal.com'
    : 'https://api.paypal.com'

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
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
    throw new Error('Failed to get PayPal access token')
  }

  // Create order
  const customId = JSON.stringify({
    affiliateRef: params.affiliateRef,
    productId: params.productId,
    productCost: params.productCost,
  })

  const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: params.currency,
          value: params.amount.toFixed(2),
        },
        description: params.description,
        custom_id: customId,
      }],
      application_context: {
        return_url: `${process.env.VERCEL_URL || 'https://thelostandunfounds.com'}/payment/success`,
        cancel_url: `${process.env.VERCEL_URL || 'https://thelostandunfounds.com'}/payment/cancel`,
      },
    }),
  })

  const order = await orderResponse.json()
  return order
}

/**
 * Get affiliate reference from request (cookie or header)
 */
function getAffiliateRefFromRequest(req: VercelRequest): string | null {
  // Check cookie
  const cookies = req.headers.cookie || ''
  const cookieMatch = cookies.match(/affiliate_ref=([^;]+)/)
  if (cookieMatch) {
    return cookieMatch[1]
  }

  // Check header
  const affiliateHeader = req.headers['x-affiliate-ref'] as string
  if (affiliateHeader) {
    return affiliateHeader
  }

  return null
}

