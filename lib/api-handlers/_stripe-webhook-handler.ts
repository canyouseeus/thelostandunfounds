import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * Stripe Webhook Handler
 *
 * Receives webhook events from Stripe (e.g., checkout.session.completed,
 * payment_intent.succeeded, charge.refunded) and finalizes orders.
 *
 * IMPORTANT: signature verification requires the RAW request body. The
 * route shim in api/webhooks/stripe.ts disables Vercel's bodyParser so
 * we can re-read the raw bytes here.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
        console.error('❌ Stripe webhook not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)')
        return res.status(500).json({ error: 'Stripe webhook not configured' })
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
        typescript: true,
    })

    const signature = req.headers['stripe-signature'] as string | undefined
    if (!signature) {
        console.warn('⚠️ Stripe webhook missing stripe-signature header')
        return res.status(400).json({ error: 'Missing stripe-signature header' })
    }

    // Read raw body. Vercel exposes it via req.body when bodyParser is
    // disabled (it'll be a Buffer or string). If a framework parsed it
    // anyway, fall back to streaming the request.
    const rawBody = await readRawBody(req)

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err: any) {
        console.error('❌ Stripe webhook signature verification failed:', err?.message)
        return res.status(400).json({ error: `Webhook signature verification failed: ${err?.message}` })
    }

    console.log('🔔 Stripe webhook received:', {
        id: event.id,
        type: event.type,
    })

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                await finalizeCheckoutSession(session)
                break
            }
            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object as Stripe.Checkout.Session
                await finalizeCheckoutSession(session)
                break
            }
            case 'checkout.session.async_payment_failed':
            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session
                await markCommissionFailed(session.id)
                break
            }
            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge
                console.log('↩️ Charge refunded:', charge.id, 'amount:', charge.amount_refunded)
                // We don't currently auto-reverse affiliate commissions on refund,
                // but logging here makes it easy to add later.
                break
            }
            default:
                console.log('ℹ️ Ignoring unhandled Stripe event type:', event.type)
        }

        return res.status(200).json({ received: true })
    } catch (error: any) {
        console.error('🔥 Error processing Stripe webhook:', error)
        // Return 500 so Stripe retries.
        return res.status(500).json({ error: 'Webhook processing failed' })
    }
}

/**
 * Finalize an order whose checkout session is now paid.
 * - For photo orders (metadata.source === 'tlau-photos'): mark the
 *   photo_orders row paid and grant photo_entitlements.
 * - For all paid sessions with an affiliate ref: flip the pending commission
 *   to confirmed.
 */
async function finalizeCheckoutSession(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
        console.log('ℹ️ Session not yet paid, status:', session.payment_status)
        return
    }

    console.log('💰 Stripe Checkout PAID:', {
        sessionId: session.id,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_details?.email,
        source: session.metadata?.source,
    })

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in webhook')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (session.metadata?.source === 'tlau-photos') {
        await finalizePhotoOrder(supabase, session)
    }

    // Flip the pending affiliate commission to confirmed (works for both
    // shop and photo orders since both write commissions keyed by session id).
    const { data: updated, error } = await supabase
        .from('affiliate_commissions')
        .update({ status: 'confirmed' })
        .eq('order_id', session.id)
        .eq('source', 'stripe')
        .select()

    if (error) {
        console.error('❌ Failed to confirm affiliate commission:', error)
    } else if (updated && updated.length > 0) {
        console.log('✅ Affiliate commission confirmed for session:', session.id)
    }
}

/**
 * Mark a photo order paid and grant entitlements for its selected photos.
 * Idempotent: a replayed webhook will see the order already completed and
 * the entitlements already inserted (UPSERT-shaped via upsert).
 */
async function finalizePhotoOrder(
    supabase: any,
    session: Stripe.Checkout.Session
) {
    const photoOrderId = session.metadata?.photoOrderId
    const photoIdsRaw = session.metadata?.photoIds || ''
    const photoIds = photoIdsRaw.split(',').filter(Boolean)

    if (!photoOrderId || photoIds.length === 0) {
        console.error('❌ tlau-photos session missing metadata:', session.metadata)
        return
    }

    const { error: updateError } = await supabase
        .from('photo_orders')
        .update({ payment_status: 'completed', paypal_order_id: session.id })
        .eq('id', photoOrderId)

    if (updateError) {
        console.error('❌ Failed to mark photo_order completed:', updateError)
        return
    }

    // 1-year entitlements for paid orders (matches the historical free-checkout
    // window). Strike-only orders use a 48-hour window per checkout.ts.
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    const rows = photoIds.map(photoId => ({
        order_id: photoOrderId,
        photo_id: photoId,
        expires_at: expiresAt,
    }))

    const { error: entError } = await supabase
        .from('photo_entitlements')
        .upsert(rows, { onConflict: 'order_id,photo_id', ignoreDuplicates: true })

    if (entError) {
        console.error('❌ Failed to insert photo_entitlements:', entError)
        return
    }

    console.log('✅ Photo order finalized:', { photoOrderId, photoCount: photoIds.length })
}

/**
 * Mark a session's affiliate commission as failed (expired or async-failed).
 */
async function markCommissionFailed(sessionId: string) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase
        .from('affiliate_commissions')
        .update({ status: 'failed' })
        .eq('order_id', sessionId)
        .eq('source', 'stripe')
        .eq('status', 'pending')
}

/**
 * Read the raw request body as a Buffer.
 * Vercel/Node passes the body in different shapes depending on whether
 * bodyParser ran; this normalizes them.
 */
async function readRawBody(req: VercelRequest): Promise<Buffer> {
    // If body is already a Buffer (bodyParser disabled), use it directly.
    const body = (req as any).body
    if (Buffer.isBuffer(body)) return body
    if (typeof body === 'string') return Buffer.from(body, 'utf8')

    // Otherwise, read the stream.
    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
    })
}
