import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendPhotoDeliveryEmail } from '../../lib/api-handlers/_photo-email-utils.js'

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { orderId, email } = req.body

        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' })
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Database configuration error' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Find Order
        const { data: order, error: orderError } = await supabase
            .from('photo_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return res.status(404).json({ error: 'Order not found' })
        }

        // Verify email matches if provided
        if (email && order.customer_email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({ error: 'Verification failed' })
        }

        if (order.payment_status !== 'completed') {
            return res.status(400).json({ error: 'Order is not completed' })
        }

        // 2. Fetch Entitlements
        const { data: entitlements, error: entitlementError } = await supabase
            .from('photo_entitlements')
            .select('*')
            .eq('order_id', order.id)

        if (entitlementError) throw entitlementError

        // 3. Send Email
        await sendPhotoDeliveryEmail(order.customer_email, order.id, entitlements);

        return res.status(200).json({ success: true, message: 'Links resent to your email' })

    } catch (error: any) {
        console.error('[Resend] error:', error)
        return res.status(500).json({ error: 'Failed to resend links' })
    }
}
