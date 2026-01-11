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
        const environment = (process.env.PAYPAL_ENVIRONMENT || '').toUpperCase()
        const isSandbox = environment !== 'LIVE'
        const clientId = isSandbox
            ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
            : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
        const clientSecret = isSandbox
            ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
            : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
        const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com'

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
            return res.status(500).json({ error: 'Failed to capture payment', details: error })
        }

        const captureData = await captureResponse.json()

        // Get custom data (photoIds, email) from the order
        const orderDetailsResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
            }
        })
        const orderDetails = await orderDetailsResponse.json()
        const { photoIds, email } = JSON.parse(orderDetails.purchase_units[0].custom_id)

        // Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Create Order record
        const { data: photoOrder, error: orderError } = await supabase
            .from('photo_orders')
            .insert({
                email,
                total_amount_cents: Math.round(parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value) * 100),
                paypal_order_id: orderId,
                payment_status: 'completed'
            })
            .select()
            .single()

        if (orderError) throw orderError

        // 2. Create Entitlements
        const entitlements = photoIds.map((photoId: string) => ({
            order_id: photoOrder.id,
            photo_id: photoId,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
        }))

        const { data: createdEntitlements, error: entitlementError } = await supabase
            .from('photo_entitlements')
            .insert(entitlements)
            .select()

        if (entitlementError) throw entitlementError

        return res.status(200).json({
            success: true,
            orderId: photoOrder.id,
            entitlements: createdEntitlements.map(e => ({
                photoId: e.photo_id,
                token: e.token
            }))
        })

    } catch (error: any) {
        console.error('Capture error:', error)
        return res.status(500).json({ error: 'Payment capture failed' })
    }
}
