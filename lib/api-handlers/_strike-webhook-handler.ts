import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createProdigiOrder } from './_prodigi-client.js'
import { triggerReferralCommission } from './affiliates/_commission-trigger.js'

const STRIKE_API_URL = 'https://api.strike.me'

/**
 * Strike Webhook Handler
 * 
 * Receives webhook events from Strike when invoice state changes.
 * Primary event: invoice.updated → check if state is PAID → finalize order
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const event = req.body

        console.log('🔔 Strike webhook received:', {
            id: event.id,
            eventType: event.eventType,
            entityId: event.data?.entityId,
            changes: event.data?.changes,
        })

        // We only care about invoice updates
        if (event.eventType !== 'invoice.updated') {
            console.log('ℹ️ Ignoring non-invoice event:', event.eventType)
            return res.status(200).json({ received: true })
        }

        const strikeApiKey = process.env.STRIKE_API_KEY
        if (!strikeApiKey) {
            console.error('❌ STRIKE_API_KEY not configured for webhook')
            return res.status(500).json({ error: 'Strike not configured' })
        }

        const invoiceId = event.data?.entityId
        if (!invoiceId) {
            console.warn('⚠️ Webhook missing entityId')
            return res.status(400).json({ error: 'Missing entityId' })
        }

        // Fetch the full invoice to check its current state
        const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices/${invoiceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${strikeApiKey}`,
                'Content-Type': 'application/json',
            },
        })

        if (!invoiceResponse.ok) {
            console.error('❌ Failed to fetch invoice for webhook:', invoiceResponse.status)
            return res.status(500).json({ error: 'Failed to fetch invoice' })
        }

        const invoice = await invoiceResponse.json()

        console.log('📋 Invoice state:', {
            invoiceId: invoice.invoiceId,
            state: invoice.state,
            amount: invoice.amount,
            correlationId: invoice.correlationId,
        })

        // Only process PAID invoices
        if (invoice.state !== 'PAID') {
            console.log('ℹ️ Invoice not yet paid, state:', invoice.state)
            return res.status(200).json({ received: true, state: invoice.state })
        }

        // Invoice is PAID — finalize the order
        console.log('💰 Invoice PAID! Processing order:', invoice.invoiceId)

        // Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)

            // Update any pending affiliate commissions to confirmed
            const { data: updatedCommissions, error: commissionError } = await supabase
                .from('affiliate_commissions')
                .update({ status: 'confirmed' })
                .eq('order_id', invoice.invoiceId)
                .eq('status', 'pending')
                .select()

            if (commissionError) {
                console.error('⚠️ Failed to update affiliate commissions:', commissionError)
            } else if (updatedCommissions && updatedCommissions.length > 0) {
                console.log('✅ Affiliate commissions confirmed:', updatedCommissions.length)
            }

            await finalizeProdigiStrikeOrder(supabase, invoice.invoiceId)
        }

        // TODO: Send order confirmation email via Zoho
        // (Can reuse existing email utilities from lib/api-handlers/_zoho-email-utils.ts)

        return res.status(200).json({
            received: true,
            state: 'PAID',
            invoiceId: invoice.invoiceId,
        })
    } catch (error: any) {
        console.error('🔥 Strike webhook error:', error)
        // Return 200 to prevent Strike from retrying on app errors
        return res.status(200).json({ received: true, error: error.message })
    }
}

/**
 * If this paid Strike invoice belongs to a Prodigi print order, submit it to
 * Prodigi and trigger the affiliate commission. The recipient shipping
 * address was already collected client-side at checkout (Strike has no
 * hosted address-collection step), so it's already on the prodigi_orders row.
 * Idempotent — skips if already past 'paid'.
 */
async function finalizeProdigiStrikeOrder(supabase: any, invoiceId: string) {
    const { data: order, error: orderError } = await supabase
        .from('prodigi_orders')
        .select('*')
        .eq('payment_ref', invoiceId)
        .maybeSingle()

    if (orderError || !order) return // Not a Prodigi order — nothing to do.
    if (order.status !== 'pending_payment') {
        console.log('ℹ️ prodigi_order (strike) already processed, skipping:', order.id, order.status)
        return
    }

    await supabase
        .from('prodigi_orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', order.id)

    try {
        const origin = process.env.SITE_URL || 'https://www.thelostandunfounds.com'
        const result = await createProdigiOrder({
            merchantReference: order.id,
            idempotencyKey: order.id,
            recipient: order.recipient,
            items: [
                { sku: order.sku, copies: order.copies || 1, assets: [{ printArea: 'default', url: order.asset_url }] },
            ],
            callbackUrl: `${origin.replace(/\/$/, '')}/api/prodigi/webhook`,
            metadata: { prodigiOrderRowId: order.id },
        })

        await supabase
            .from('prodigi_orders')
            .update({
                status: 'submitted',
                prodigi_order_id: result?.order?.id || null,
                prodigi_status: result?.order?.status || null,
                submitted_at: new Date().toISOString(),
            })
            .eq('id', order.id)

        console.log('✅ Prodigi order (strike) submitted:', { rowId: order.id, prodigiOrderId: result?.order?.id })
    } catch (prodigiErr: any) {
        console.error('❌ Failed to submit Prodigi order (strike):', prodigiErr?.message || prodigiErr)
        await supabase
            .from('prodigi_orders')
            .update({ status: 'error', error_message: prodigiErr?.message || 'Prodigi submission failed' })
            .eq('id', order.id)
    }

    const customerEmail = order.customer_email || order.recipient?.email
    if (customerEmail) {
        const profit = Math.max(0, Number(order.unit_price) - Number(order.unit_cost)) * (order.copies || 1)
        if (profit > 0) {
            const result = await triggerReferralCommission(supabase, {
                email: customerEmail,
                source: 'prodigi_order',
                sourceId: order.id,
                grossAmount: profit,
                fallbackAffiliateCode: order.affiliate_ref || null,
            })
            if (result.triggered) {
                console.log('✅ Prodigi order (strike) commission registered:', { order: order.id, amount: result.amount })
            }
        }
    }
}
