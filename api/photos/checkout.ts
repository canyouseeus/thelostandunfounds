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
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Server configuration error' })
    }

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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('PayPal Token Error:', errorText)
      return res.status(500).json({ error: 'Failed to authenticate with PayPal', details: errorText })
    }

    const { access_token } = await tokenResponse.json()

    // Create the order (Minimal custom_id to avoid length limits)
    // We only send EMAIL in custom_id for reference. The real data is stored in our DB.
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2),
        },
        description: `Photo Download Access (${count} photos)`,
        custom_id: JSON.stringify({ email }), // Just email, keep it short!
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

    if (!orderResponse.ok || !order.id) {
      console.error('PayPal Order Error:', order)
      return res.status(500).json({ error: 'Failed to create PayPal order', details: order })
    }

    // Persist Order to Supabase (Pending Status)
    const { data: photoOrder, error: dbOrderError } = await supabase
      .from('photo_orders')
      .insert({
        email,
        total_amount_cents: Math.round(amount * 100),
        paypal_order_id: order.id,
        payment_status: 'pending' // Initial status
      })
      .select()
      .single()

    if (dbOrderError) {
      console.error('Database Order Error:', dbOrderError)
      return res.status(500).json({ error: 'Failed to save order record' })
    }

    // Create Pending Entitlements
    const entitlements = photoIds.map((photoId: string) => ({
      order_id: photoOrder.id,
      photo_id: photoId,
      // We set a temporary expiry or check status later. 
      // Ideally, we verify payment_status='completed' before delivering.
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    }))

    const { error: dbEntitlementsError } = await supabase
      .from('photo_entitlements')
      .insert(entitlements)

    if (dbEntitlementsError) {
      console.error('Database Entitlements Error:', dbEntitlementsError)
      // Non-fatal? No, fatal.
      return res.status(500).json({ error: 'Failed to save order items' })
    }

    return res.status(200).json({
      orderId: order.id,
      approvalUrl: order.links.find((l: any) => l.rel === 'approve').href
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'Checkout failed' })
  }
}
