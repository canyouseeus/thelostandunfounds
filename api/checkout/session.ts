import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/checkout/session?session_id=cs_...
 *
 * Looks up a shop_orders row by Stripe Checkout Session id so the
 * /shop/success page can render a confirmation without exposing the full
 * order record. Polls until the webhook flips status to 'paid' (the success
 * page redirect can arrive before Stripe delivers the webhook).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : ''
    if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ error: 'Invalid session_id' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database not configured' })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: order, error } = await supabase
        .from('shop_orders')
        .select('id, status, product_kind, amount_total_cents, currency, customer_email, price_id, quantity')
        .eq('stripe_session_id', sessionId)
        .single()

    if (error || !order) {
        return res.status(404).json({ error: 'Order not found' })
    }

    return res.status(200).json({
        id: order.id,
        status: order.status,
        productKind: order.product_kind,
        amountTotalCents: order.amount_total_cents,
        currency: order.currency,
        customerEmail: order.customer_email,
        priceId: order.price_id,
        quantity: order.quantity,
    })
}
