import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/checkout/download?token=...
 *
 * Validates a one-time download token issued to digital-product purchasers
 * by the Stripe webhook (see _stripe-webhook-handler → finalizeShopOrder).
 *
 * The token and its expiry live in shop_orders.metadata so we can validate
 * without a separate table. If the product's metadata includes a file_url
 * we 302 to it; otherwise we return JSON describing the order so the seller
 * can wire up product-specific delivery later.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const token = typeof req.query.token === 'string' ? req.query.token : ''
    if (!token || !token.startsWith('dl_')) {
        return res.status(400).json({ error: 'Invalid token' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database not configured' })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: order, error } = await supabase
        .from('shop_orders')
        .select('id, status, product_kind, metadata')
        .eq('metadata->>downloadToken', token)
        .single()

    if (error || !order) {
        return res.status(404).json({ error: 'Download link not found' })
    }
    if (order.status !== 'paid') {
        return res.status(403).json({ error: 'Order is not paid' })
    }
    if (order.product_kind !== 'digital') {
        return res.status(400).json({ error: 'Order is not a digital product' })
    }

    const expiresAt = order.metadata?.downloadExpiresAt as string | undefined
    if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ error: 'Download link has expired' })
    }

    const fileUrl = order.metadata?.file_url as string | undefined
    if (fileUrl) {
        res.setHeader('Location', fileUrl)
        return res.status(302).end()
    }

    // No file URL configured yet — return order info so support can deliver
    // manually. Once a digital product is registered with metadata.file_url,
    // the 302 above will fire automatically.
    return res.status(200).json({
        ok: true,
        orderId: order.id,
        note: 'Order verified; no file_url configured for this product yet.',
    })
}
