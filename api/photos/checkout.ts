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
    const { photoIds, email } = req.body

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be a non-empty array' })
    }

    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    // Pricing Logic
    // 1 photo = $5
    // 3 photos = $8
    let amount = 0
    const count = photoIds.length

    if (count === 1) {
      amount = 5.00
    } else if (count === 3) {
      amount = 8.00
    } else {
      // For other counts, we use a simple additive logic for now or enforce 1 or 3
      // But let's be flexible: 2 = $10, 4 = $8 + $5, etc.
      const bundlesOf3 = Math.floor(count / 3)
      const remainder = count % 3
      amount = (bundlesOf3 * 8.00) + (remainder * 5.00)
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify photo IDs exist
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, title')
      .in('id', photoIds)

    if (photoError || photos.length !== photoIds.length) {
      return res.status(400).json({ error: 'One or more invalid photo IDs' })
    }

    // Create PayPal order
    const environment = (process.env.PAYPAL_ENVIRONMENT || '').toUpperCase()
    const isSandbox = environment !== 'LIVE'
    const clientId = isSandbox
      ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
      : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
    const clientSecret = isSandbox
      ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
      : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
    const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com'

    console.log(`[PayPal] Initializing checkout in ${isSandbox ? 'SANDBOX' : 'LIVE'} mode`)

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PayPal credentials not configured' })
    }

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const { access_token } = await tokenResponse.json()

    // Create the order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        description: `Photo Download Access (${count} photos)`,
        custom_id: JSON.stringify({ photoIds, email }),
      }],
      application_context: {
        brand_name: 'THE LOST+UNFOUNDS',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.APP_URL || 'https://www.thelostandunfounds.com'}/photos/success`,
        cancel_url: `${process.env.APP_URL || 'https://www.thelostandunfounds.com'}/photos/cancel`,
      },
    }

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderPayload),
    })

    const order = await orderResponse.json()

    return res.status(200).json({
      orderId: order.id,
      approvalUrl: order.links.find((l: any) => l.rel === 'approve').href
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'Checkout failed' })
  }
}
