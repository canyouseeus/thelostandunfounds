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
        const { orderId } = req.body

        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' })
        }

        // Initialize PayPal
        const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
        const isLive = environment === 'LIVE'

        const clientId = isLive
            ? (process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID)
            : (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID)

        const clientSecret = isLive
            ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET)
            : (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET)

        const baseUrl = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

        if (!clientId || !clientSecret) {
            console.error('[Capture] Missing PayPal credentials for', environment)
            return res.status(500).json({ error: 'PayPal credentials not configured' })
        }

        // Get PayPal access token
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64')}`,
            },
            body: 'grant_type=client_credentials',
        })

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text()
            console.error('[Capture] PayPal Token Error:', errorText)
            return res.status(500).json({ error: 'Failed to authenticate with PayPal' })
        }

        const { access_token } = await tokenResponse.json()

        // Capture the order
        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            }
        })

        if (!captureResponse.ok) {
            const error = await captureResponse.json()
            console.error('[Capture] PayPal Capture Error:', error)
            return res.status(500).json({ error: 'Failed to capture payment', details: error })
        }

        const captureData = await captureResponse.json()

        // Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error('[Capture] Missing Supabase credentials')
            return res.status(500).json({ error: 'Database configuration error' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Update Order record to 'completed'
        // We find the order by paypal_order_id (which is request.orderId)
        const { data: photoOrder, error: orderError } = await supabase
            .from('photo_orders')
            .update({
                payment_status: 'completed',
                // Optional: Update final amount if needed, but we trust the initial Create Order logic mostly.
                // But let's verify amount Matches?
                // For now, simpler is better. We trust PayPal captured what we asked.
            })
            .eq('paypal_order_id', orderId)
            .select()
            .single()

        if (orderError || !photoOrder) {
            console.error('Database Update Error:', orderError)
            return res.status(500).json({ error: 'Failed to update order status' })
        }

        // 2. Fetch Entitlements
        // They were created in checkout.ts
        const { data: entitlements, error: entitlementError } = await supabase
            .from('photo_entitlements')
            .select('*')
            .eq('order_id', photoOrder.id)

        if (entitlementError) throw entitlementError

        return res.status(200).json({
            success: true,
            orderId: photoOrder.id,
            entitlements: entitlements.map(e => ({
                photoId: e.photo_id,
                token: e.token
            }))
        })

    } catch (error: any) {
        console.error('Capture error:', error)
        return res.status(500).json({ error: 'Payment capture failed' })
    }
}
