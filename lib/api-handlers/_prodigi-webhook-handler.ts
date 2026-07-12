import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STAGE_TO_STATUS: Record<string, string> = {
    InProgress: 'in_production',
    Complete: 'complete',
    Cancelled: 'cancelled',
}

/**
 * POST /api/prodigi/webhook
 *
 * Receives Prodigi's CloudEvents-shaped order status webhooks
 * (callbackUrl set at order creation — see _stripe-webhook-handler.ts /
 * _strike-webhook-handler.ts). Updates the matching prodigi_orders row's
 * status and, when present, shipment/tracking info.
 *
 * Docs: https://www.prodigi.com/print-api/docs/reference/#webhooks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase not configured for Prodigi webhook')
        return res.status(200).json({ received: true, error: 'not configured' })
    }

    try {
        const event = req.body || {}
        const order = event.data?.order
        const prodigiOrderId: string | undefined = order?.id || event.subject

        console.log('🔔 Prodigi webhook received:', { type: event.type, prodigiOrderId })

        if (!prodigiOrderId) {
            return res.status(200).json({ received: true })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data: row } = await supabase
            .from('prodigi_orders')
            .select('id, status')
            .eq('prodigi_order_id', prodigiOrderId)
            .maybeSingle()

        if (!row) {
            console.warn('⚠️ Prodigi webhook for unknown order:', prodigiOrderId)
            return res.status(200).json({ received: true })
        }

        const stage: string | undefined = order?.status?.stage
        const nextStatus = stage ? STAGE_TO_STATUS[stage] : undefined

        const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : null
        const trackingNumber = shipment?.tracking?.number || shipment?.trackingNumber || null
        const trackingUrl = shipment?.tracking?.url || shipment?.trackingUrl || null
        const carrier = shipment?.carrier?.name || null

        const updates: Record<string, unknown> = { prodigi_status: order?.status || null }
        if (nextStatus) updates.status = trackingNumber && nextStatus === 'complete' ? 'shipped' : nextStatus
        if (trackingNumber) updates.tracking_number = trackingNumber
        if (trackingUrl) updates.tracking_url = trackingUrl
        if (carrier) updates.shipping_carrier = carrier
        if (trackingNumber && !row.status.match(/shipped|complete/)) updates.shipped_at = new Date().toISOString()

        await supabase.from('prodigi_orders').update(updates).eq('id', row.id)

        return res.status(200).json({ received: true })
    } catch (error: any) {
        console.error('🔥 Prodigi webhook error:', error)
        // Return 200 so Prodigi doesn't retry-storm us on our own bugs.
        return res.status(200).json({ received: true, error: error.message })
    }
}
