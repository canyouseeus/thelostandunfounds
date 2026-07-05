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

        // Initialize Supabase early for idempotency check
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error('[Capture] Missing Supabase credentials')
            return res.status(500).json({ error: 'Database configuration error' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. CHECK IF ALREADY CAPTURED (IDEMPOTENCY)
        const { data: existingOrder } = await supabase
            .from('photo_orders')
            .select('id, payment_status, affiliate_code, total_amount_cents, paypal_order_id')
            .eq('paypal_order_id', orderId)
            .single()

        if (existingOrder?.payment_status === 'completed') {
            console.log('[Capture] Order already completed, returning existing entitlements for', orderId)
            const { data: entitlements } = await supabase
                .from('photo_entitlements')
                .select('*')
                .eq('order_id', existingOrder.id)

            return res.status(200).json({
                success: true,
                orderId: existingOrder.id,
                entitlements: entitlements?.map(e => ({
                    photoId: e.photo_id,
                    token: e.token
                })) || []
            })
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

        // 1. Update Order record to 'completed'
        // We find the order by paypal_order_id (which is request.orderId)
        const { data: photoOrder, error: orderError } = await supabase
            .from('photo_orders')
            .update({
                payment_status: 'completed',
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

        // 3. Handle Affiliate Commission (Fire & Forget to not block user)
        if (photoOrder.affiliate_code) {
            try {
                // Find affiliate
                const { data: affiliate } = await supabase
                    .from('affiliates')
                    .select('id, commission_rate, total_earnings, total_conversions')
                    .eq('code', photoOrder.affiliate_code)
                    .single()

                if (affiliate) {
                    const commissionRate = affiliate.commission_rate || 10; // Default 10%
                    const commissionAmount = (Number(photoOrder.total_amount_cents) / 100) * (commissionRate / 100);

                    // Insert Approved Commission
                    await supabase.from('affiliate_commissions').insert({
                        affiliate_id: affiliate.id,
                        order_id: photoOrder.paypal_order_id, // Use PayPal ID to link cross-reference
                        amount: commissionAmount,
                        profit_generated: Number(photoOrder.total_amount_cents) / 100,
                        source: 'paypal', // fixed from 'gallery' which was likely copy-paste error in my thought process, but verifying below. Wait, this file IS paypal handler.
                        status: 'approved',
                        product_cost: 0, // Digital goods have no COGS
                        available_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30-day holding period
                    });

                    // Update Affiliate Stats
                    await supabase.from('affiliates').update({
                        total_earnings: (affiliate.total_earnings || 0) + commissionAmount,
                        total_conversions: (affiliate.total_conversions || 0) + 1
                    }).eq('id', affiliate.id);

                    console.log(`[Capture] Affiliate commission processed for ${affiliate.id}: $${commissionAmount}`);
                }
            } catch (affError) {
                console.error('[Capture] Affiliate processing error:', affError);
                // Don't fail the response, just log it
            }
        }

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
