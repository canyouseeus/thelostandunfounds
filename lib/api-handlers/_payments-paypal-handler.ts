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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Affiliate-Ref')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📥 PayPal checkout request received:', {
      amount: req.body.amount,
      currency: req.body.currency,
      productId: req.body.productId,
      hasAffiliateRef: !!getAffiliateRefFromRequest(req),
    });

    const { amount, currency = 'USD', description, productId, variantId } = req.body

    if (!amount || amount <= 0) {
      console.warn('⚠️ Invalid amount:', amount);
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
      console.error('❌ PayPal order creation failed:', paypalOrder);
      return res.status(500).json({ 
        error: 'Failed to create PayPal order',
        details: paypalOrder?.error || 'Unknown error'
      })
    }

    console.log('✅ PayPal order created:', {
      orderId: paypalOrder.id,
      approvalUrl: paypalOrder.links?.find((l: any) => l.rel === 'approve')?.href,
    });

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
  const environment = (process.env.PAYPAL_ENVIRONMENT || '').toUpperCase()
  const isSandbox = environment !== 'LIVE' // default to SANDBOX unless explicitly LIVE
  const clientId = isSandbox
    ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
    : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
  const clientSecret = isSandbox
    ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
    : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
  const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com'

  console.log('🔐 PayPal config:', {
    environment: isSandbox ? 'SANDBOX' : 'LIVE',
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    isSandbox,
    baseUrl,
  });

  if (!clientId || !clientSecret) {
    console.error('❌ PayPal credentials missing:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    throw new Error('PayPal credentials not configured. Please set PAYPAL_ENVIRONMENT along with PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET (live) or PAYPAL_CLIENT_ID_SANDBOX/PAYPAL_CLIENT_SECRET_SANDBOX (sandbox).')
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
  // Build custom_id (PayPal limits to 127 chars, must be alphanumeric + some special chars)
  const customIdData = {
    affiliateRef: params.affiliateRef || null,
    productId: params.productId || null,
    productCost: params.productCost || 0,
  }
  const customId = JSON.stringify(customIdData).substring(0, 127)

  // Resolve return/cancel base URL with sandbox override support
  const returnUrlBase = (() => {
    const trimSlash = (url: string) => url.replace(/\/+$/, '')
    if (isSandbox && process.env.PAYPAL_RETURN_URL_SANDBOX) {
      return trimSlash(process.env.PAYPAL_RETURN_URL_SANDBOX)
    }
    if (process.env.PAYPAL_RETURN_URL) {
      return trimSlash(process.env.PAYPAL_RETURN_URL)
    }
    if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('localhost')) {
      return `https://${process.env.VERCEL_URL}`
    }
    if (process.env.NEXT_PUBLIC_VERCEL_URL && !process.env.NEXT_PUBLIC_VERCEL_URL.includes('localhost')) {
      return process.env.NEXT_PUBLIC_VERCEL_URL
    }
    // Localhost - MUST use http:// not https://
    return 'http://localhost:3000'
  })()

  // Build order payload
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: params.currency,
        value: params.amount.toFixed(2),
      },
      ...(params.description ? { description: params.description.substring(0, 127) } : {}), // PayPal limits description to 127 chars
      ...(customId && customId.length > 0 ? { custom_id: customId } : {}), // Only include if not empty
    }],
      application_context: {
        brand_name: 'THE LOST+UNFOUNDS',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${returnUrlBase}/payment/success`,
        cancel_url: `${returnUrlBase}/payment/cancel`,
      },
  }

  console.log('📤 Creating PayPal order with payload:', JSON.stringify(orderPayload, null, 2))

  const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'PayPal-Request-Id': `order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    },
    body: JSON.stringify(orderPayload),
  })

  const responseText = await orderResponse.text()
  console.log('📥 PayPal API response:', {
    status: orderResponse.status,
    statusText: orderResponse.statusText,
    headers: Object.fromEntries(orderResponse.headers.entries()),
    body: responseText.substring(0, 500), // First 500 chars
  })

  if (!orderResponse.ok) {
    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch {
      errorData = { message: responseText }
    }
    console.error('❌ PayPal API error:', {
      status: orderResponse.status,
      statusText: orderResponse.statusText,
      error: errorData,
      fullResponse: responseText,
    })
    throw new Error(`PayPal API error: ${orderResponse.status} ${orderResponse.statusText} - ${JSON.stringify(errorData)}`)
  }

  let order
  try {
    order = JSON.parse(responseText)
  } catch (e: any) {
    console.error('❌ Failed to parse PayPal response:', e, responseText)
    throw new Error('Invalid JSON response from PayPal')
  }
  
  if (!order.id) {
    console.error('❌ PayPal order missing ID:', order)
    throw new Error('Invalid PayPal order response - missing order ID')
  }

  console.log('✅ PayPal order created successfully:', {
    orderId: order.id,
    status: order.status,
    links: order.links?.map((l: any) => ({ rel: l.rel, href: l.href })),
  })
  
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

