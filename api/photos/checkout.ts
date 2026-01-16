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

    const count = photoIds.length;

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Checkout] Missing Supabase credentials')
      return res.status(500).json({ error: 'Database configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify photo IDs exist and find associated library
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, title, library_id')
      .in('id', photoIds)

    if (photoError || photos.length !== photoIds.length) {
      return res.status(400).json({ error: 'One or more invalid photo IDs' })
    }

    const libraryId = photos[0].library_id;

    // Fetch pricing options for this library
    const { data: pricingOptions, error: pricingError } = await supabase
      .from('gallery_pricing_options')
      .select('*')
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .order('photo_count', { ascending: false });

    if (pricingError || !pricingOptions || pricingOptions.length === 0) {
      console.warn('No pricing options found for library:', libraryId);
    }

    // Dynamic Pricing Calculation
    let amount = 0;
    let remaining = count;
    const sortedOptions = pricingOptions || [];

    // Fallback single price
    const { data: library } = await supabase
      .from('photo_libraries')
      .select('price')
      .eq('id', libraryId)
      .single();

    const singlePrice = sortedOptions.find((o: any) => o.photo_count === 1)?.price || library?.price || 5.00;

    for (const option of sortedOptions) {
      if (option.photo_count <= 0) continue;
      const numBundles = Math.floor(remaining / option.photo_count);
      if (numBundles > 0) {
        amount += numBundles * parseFloat(option.price.toString());
        remaining %= option.photo_count;
      }
    }

    if (remaining > 0) {
      amount += remaining * parseFloat(singlePrice.toString());
    }

    // Create PayPal order
    const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
    const isLive = environment === 'LIVE'

    // Explicitly prioritize the correct key for the environment
    const clientId = isLive
      ? (process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID)
      : (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID)

    const clientSecret = isLive
      ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET)
      : (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET)

    const baseUrl = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

    console.log(`[PayPal] ${environment} Mode: Using Client ID starting with ${clientId?.substring(0, 5)}`)

    if (!clientId || !clientSecret) {
      console.error('[PayPal] Missing credentials for', environment)
      return res.status(500).json({ error: `PayPal credentials not configured for ${environment}` })
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
      console.error('[Checkout] Database Order Error:', {
        error: dbOrderError,
        payload: {
          email,
          total_amount_cents: Math.round(amount * 100),
          paypal_order_id: order.id
        }
      })
      return res.status(500).json({
        error: 'Failed to save order record',
        details: dbOrderError.message
      })
    }

    // Create Pending Entitlements
    const entitlements = photoIds.map((photoId: string) => ({
      order_id: photoOrder.id,
      photo_id: photoId,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    }))

    const { error: dbEntitlementsError } = await supabase
      .from('photo_entitlements')
      .insert(entitlements)

    if (dbEntitlementsError) {
      console.error('[Checkout] Database Entitlements Error:', {
        error: dbEntitlementsError,
        orderId: photoOrder.id,
        photoIds
      })
      return res.status(500).json({
        error: 'Failed to save order items',
        details: dbEntitlementsError.message
      })
    }

    return res.status(200).json({
      orderId: order.id,
      approvalUrl: order.links.find((l: any) => l.rel === 'approve').href
    })

  } catch (error: any) {
    console.error('[Checkout] Fatal Error:', error)
    return res.status(500).json({
      error: 'Checkout failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
