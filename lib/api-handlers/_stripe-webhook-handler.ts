import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { triggerReferralCommission } from './affiliates/_commission-trigger.js'

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
        apiVersion: '2024-12-18.acacia' as any,
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
                await markShopOrderTerminal(
                    session.id,
                    event.type === 'checkout.session.expired' ? 'expired' : 'failed'
                )
                break
            }
            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice
                await finalizeStripeInvoice(invoice)
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
        await triggerPhotoOrderCommission(supabase, session)
    } else if (session.metadata?.source === 'tlau-shop-checkout') {
        await finalizeShopOrder(supabase, session)
    } else if (session.metadata?.source === 'tlau-events') {
        await finalizeEventOrder(supabase, session)
    } else if (session.payment_link) {
        // Booking deposit / final-balance payments are made through Stripe
        // Payment Links (not Checkout Sessions), so they carry no metadata.source.
        // We match them back to an invoice via the payment link id.
        await finalizeBookingPayment(supabase, session)
    }

    // Flip any pre-existing pending affiliate commission to confirmed (legacy
    // path — the new flow writes a 'photo_order' / 'booking' source row via
    // triggerReferralCommission and skips this).
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
 * Look up the photo order, then call the idempotent commission trigger.
 * This is a no-op when the customer wasn't referred or when a commission
 * already exists for this source+source_id.
 */
async function triggerPhotoOrderCommission(supabase: any, session: Stripe.Checkout.Session) {
    const photoOrderId = session.metadata?.photoOrderId
    if (!photoOrderId) return

    const { data: order } = await supabase
        .from('photo_orders')
        .select('id, email, total_amount_cents, affiliate_code')
        .eq('id', photoOrderId)
        .single()

    if (!order || !order.email) return

    const grossAmount = (Number(order.total_amount_cents) || 0) / 100
    if (grossAmount <= 0) return

    const result = await triggerReferralCommission(supabase, {
        email: order.email,
        source: 'photo_order',
        sourceId: order.id,
        grossAmount,
        fallbackAffiliateCode: order.affiliate_code || session.metadata?.affiliateRef || null,
    })

    if (result.triggered) {
        console.log('✅ Photo order commission registered:', {
            order: order.id,
            amount: result.amount,
            affiliate: result.affiliateId,
        })
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
 * Mark a shop_orders row paid and stamp the Stripe customer_id +
 * payment_intent + amount. Idempotent: a replayed webhook sees the row
 * already paid and short-circuits.
 *
 * For digital products this also fires off the delivery email with a
 * time-limited download token; the token itself lives in shop_orders.metadata
 * so the download endpoint can verify expiry without a separate table.
 */
async function finalizeShopOrder(
    supabase: any,
    session: Stripe.Checkout.Session
) {
    const shopOrderId = session.metadata?.shopOrderId
    if (!shopOrderId) {
        console.error('❌ tlau-shop-checkout session missing shopOrderId metadata:', session.metadata)
        return
    }

    // Idempotency guard: if already paid, do nothing.
    const { data: existing } = await supabase
        .from('shop_orders')
        .select('id, status, product_kind, customer_email, metadata')
        .eq('id', shopOrderId)
        .single()

    if (existing?.status === 'paid') {
        console.log('ℹ️ shop_order already paid, skipping:', shopOrderId)
        return
    }

    const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        existing?.customer_email ||
        null

    const productKind = session.metadata?.productKind || existing?.product_kind || 'physical'

    // For digital products, mint a 72-hour download token and stash it in
    // metadata so the email link and the download endpoint can both find it.
    let downloadToken: string | null = null
    let downloadExpiresAt: string | null = null
    if (productKind === 'digital') {
        downloadToken = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`
        downloadExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    }

    const nextMetadata = {
        ...(existing?.metadata || {}),
        source: 'tlau-shop-checkout',
        ...(downloadToken
            ? { downloadToken, downloadExpiresAt }
            : {}),
        ...((session as any).shipping_details
            ? { shippingDetails: (session as any).shipping_details }
            : {}),
    }

    const { error: updateError } = await supabase
        .from('shop_orders')
        .update({
            status: 'paid',
            stripe_customer_id: (session.customer as string) || null,
            stripe_payment_intent: (session.payment_intent as string) || null,
            amount_total_cents: session.amount_total ?? null,
            currency: session.currency ?? null,
            customer_email: customerEmail,
            paid_at: new Date().toISOString(),
            metadata: nextMetadata,
        })
        .eq('id', shopOrderId)

    if (updateError) {
        console.error('❌ Failed to mark shop_order paid:', updateError)
        return
    }

    console.log('✅ Shop order finalized:', {
        shopOrderId,
        productKind,
        amountTotal: session.amount_total,
        customerId: session.customer,
    })

    if (productKind === 'digital' && customerEmail && downloadToken) {
        try {
            const { sendShopDigitalDeliveryEmail } = await import('./_shop-email-utils.js')
            await sendShopDigitalDeliveryEmail({
                email: customerEmail,
                shopOrderId,
                downloadToken,
                downloadExpiresAt: downloadExpiresAt!,
            })
            console.log('📧 Digital delivery email sent for shop_order:', shopOrderId)
        } catch (emailErr: any) {
            console.error('⚠️ Failed to send digital delivery email:', emailErr?.message || emailErr)
            // Don't throw — the order is paid; resend can be triggered manually.
        }
    }
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
 * Mark a pending shop_order as expired or failed once Stripe says the
 * underlying Checkout Session won't pay. Only flips rows still in 'pending'
 * so we never overwrite a confirmed payment.
 */
async function markShopOrderTerminal(sessionId: string, status: 'expired' | 'failed') {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase
        .from('shop_orders')
        .update({ status })
        .eq('stripe_session_id', sessionId)
        .eq('status', 'pending')
}

/**
 * Finalize a paid event ticket order:
 *  1. Mark event_orders row as paid
 *  2. Create event_tickets record (matches what the purchase_ticket RPC would do)
 *  3. Trigger affiliate commission (source: 'event_ticket', profit = full ticket price)
 */
async function finalizeEventOrder(supabase: any, session: Stripe.Checkout.Session) {
    const eventOrderId = session.metadata?.eventOrderId
    if (!eventOrderId) {
        console.error('❌ tlau-events session missing eventOrderId metadata:', session.metadata)
        return
    }

    // Load the order row
    const { data: order, error: orderError } = await supabase
        .from('event_orders')
        .select('*')
        .eq('id', eventOrderId)
        .single()

    if (orderError || !order) {
        console.error('❌ event_order not found:', eventOrderId, orderError)
        return
    }

    // Idempotency: if already paid, skip
    if (order.status === 'paid') {
        console.log('ℹ️ event_order already paid, skipping:', eventOrderId)
        return
    }

    const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        order.customer_email

    // Mark the order paid
    const { error: updateError } = await supabase
        .from('event_orders')
        .update({
            status: 'paid',
            stripe_session_id: session.id,
        })
        .eq('id', eventOrderId)

    if (updateError) {
        console.error('❌ Failed to mark event_order paid:', updateError)
        return
    }

    // Create event_ticket record(s) — one per quantity
    const qty = Number(order.quantity) || 1
    const ticketRows = Array.from({ length: qty }, () => ({
        event_id: order.event_id,
        user_id: order.user_id || null,
        customer_email: customerEmail?.toLowerCase() || order.customer_email,
        customer_name: order.customer_name || null,
        purchase_amount_cents: Math.round(order.amount_cents / qty),
        tier_id: order.tier_id || null,
        status: 'valid',
        affiliate_ref: order.affiliate_ref || null,
        event_order_id: eventOrderId,
        ...(order.form_responses ? { form_responses: order.form_responses } : {}),
    }))

    const { error: ticketError } = await supabase
        .from('event_tickets')
        .insert(ticketRows)

    if (ticketError) {
        console.error('❌ Failed to create event_tickets:', ticketError)
        // Don't return — commission should still fire; tickets can be created manually
    } else {
        console.log('✅ Event tickets created:', { eventOrderId, qty })
    }

    // Trigger affiliate commission — profit = full ticket price (no cost tracked for events)
    if (customerEmail) {
        const grossAmount = (Number(order.amount_cents) || 0) / 100
        if (grossAmount > 0) {
            const result = await triggerReferralCommission(supabase, {
                email: customerEmail,
                source: 'event_ticket',
                sourceId: eventOrderId,
                grossAmount,
                userId: order.user_id || null,
                fallbackAffiliateCode: order.affiliate_ref || session.metadata?.affiliateRef || null,
            })

            if (result.triggered) {
                console.log('✅ Event ticket commission registered:', {
                    order: eventOrderId,
                    amount: result.amount,
                    affiliate: result.affiliateId,
                })
            } else {
                console.log('ℹ️ No affiliate commission for event order:', eventOrderId, result.reason)
            }
        }
    }
}

/**
 * Finalize a booking quote-deposit or final-balance payment made via a
 * Stripe Payment Link.
 *
 *  1. Match the invoice by the payment link id stored on it.
 *  2. Record an invoice_payments row and mark the invoice paid.
 *  3. Advance the booking: 'deposit_paid' after a quote, 'paid' after a final
 *     invoice (the final payment also triggers the affiliate commission).
 *
 * Idempotent: a replayed webhook sees the invoice already paid and exits.
 */
async function finalizeBookingPayment(supabase: any, session: Stripe.Checkout.Session) {
    const paymentLinkId =
        typeof session.payment_link === 'string'
            ? session.payment_link
            : session.payment_link?.id || null
    if (!paymentLinkId) return

    const { data: invoice } = await supabase
        .from('invoices')
        .select('id, booking_id, invoice_type, status, total')
        .eq('stripe_payment_link_id', paymentLinkId)
        .maybeSingle()

    // Not one of ours (some other payment link) — nothing to do.
    if (!invoice) return

    if (invoice.status === 'paid') {
        console.log('ℹ️ Booking invoice already paid, skipping:', invoice.id)
        return
    }

    const amountPaid = (session.amount_total || 0) / 100
    const paidAt = new Date().toISOString()

    const { error: payErr } = await supabase.from('invoice_payments').insert({
        invoice_id: invoice.id,
        amount: amountPaid,
        method: 'Stripe',
        paid_at: paidAt,
        notes: `Stripe Checkout ${session.id}`,
    })
    if (payErr) {
        console.error('❌ Failed to record invoice_payment:', payErr)
        return
    }

    const { error: invErr } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', invoice.id)
    if (invErr) {
        console.error('❌ Failed to mark invoice paid:', invErr)
        return
    }

    if (!invoice.booking_id) {
        console.log('✅ Standalone invoice paid (no booking link):', invoice.id)
        return
    }

    const { data: booking } = await supabase
        .from('bookings')
        .select('id, email, status, total_amount_cents, affiliate_code')
        .eq('id', invoice.booking_id)
        .single()

    if (!booking) {
        console.warn('⚠️ Booking invoice paid but booking not found:', invoice.booking_id)
        return
    }

    if (invoice.invoice_type === 'final') {
        await supabase
            .from('bookings')
            .update({ status: 'paid', paid_at: paidAt })
            .eq('id', booking.id)
        console.log('✅ Booking fully paid:', booking.id)

        // Final payment triggers the affiliate commission on the full project
        // total. Idempotent — no-op if no referral or already triggered.
        try {
            const grossAmount = (Number(booking.total_amount_cents) || 0) / 100
            if (booking.email && grossAmount > 0) {
                const result = await triggerReferralCommission(supabase, {
                    email: booking.email,
                    source: 'booking',
                    sourceId: booking.id,
                    grossAmount,
                    fallbackAffiliateCode: booking.affiliate_code || null,
                })
                if (result.triggered) {
                    console.log('✅ Booking commission registered:', { booking: booking.id, amount: result.amount })
                }
            }
        } catch (commissionErr: any) {
            console.error('⚠️ Booking commission trigger failed:', commissionErr?.message)
        }
    } else {
        // Quote deposit paid. Don't downgrade a booking that's already 'paid'.
        if (booking.status !== 'paid') {
            await supabase
                .from('bookings')
                .update({ status: 'deposit_paid', deposit_paid_at: paidAt })
                .eq('id', booking.id)
        }
        console.log('✅ Booking deposit paid:', booking.id)
    }
}

/**
 * Finalize a booking payment recorded via a Stripe Invoice (created manually
 * in the Stripe Dashboard or via the Stripe API, not through the platform's
 * payment-link flow).
 *
 * Matching priority:
 *  1. invoice.metadata.bookingId — most reliable; set this when creating the
 *     Stripe invoice so the webhook always finds the right booking.
 *  2. invoice.customer_email — fallback; picks the most recent pending/confirmed
 *     booking for that email address.
 *
 * Idempotent: a replayed webhook sees the payment note already recorded and exits.
 */
async function finalizeStripeInvoice(stripeInvoice: Stripe.Invoice) {
    const amountPaid = (stripeInvoice.amount_paid || 0) / 100
    if (amountPaid <= 0) {
        console.log('ℹ️ invoice.paid: zero amount, skipping', stripeInvoice.id)
        return
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ invoice.paid: missing Supabase credentials')
        return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const noteKey = `Stripe Invoice ${stripeInvoice.id}`

    // Idempotency: don't record the same Stripe invoice twice.
    const { data: existingPayment } = await supabase
        .from('invoice_payments')
        .select('id')
        .eq('notes', noteKey)
        .maybeSingle()

    if (existingPayment) {
        console.log('ℹ️ invoice.paid already recorded, skipping:', stripeInvoice.id)
        return
    }

    const paidAt = stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString()

    // 1. Try bookingId from invoice metadata (most reliable).
    const bookingIdFromMeta = stripeInvoice.metadata?.bookingId || null
    const customerEmail =
        stripeInvoice.customer_email ||
        (stripeInvoice as any).customer_details?.email ||
        null

    let bookingId: string | null = bookingIdFromMeta

    // 2. Fallback: match by customer email → most recent open booking.
    if (!bookingId && customerEmail) {
        const { data: matched } = await supabase
            .from('bookings')
            .select('id')
            .ilike('email', customerEmail)
            .in('status', ['pending', 'confirmed', 'deposit_paid'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (matched) {
            bookingId = matched.id
            console.log('ℹ️ invoice.paid: matched booking by email:', customerEmail, '→', bookingId)
        }
    }

    if (!bookingId) {
        console.log('ℹ️ invoice.paid: no matching booking found', {
            stripeInvoiceId: stripeInvoice.id,
            customerEmail,
        })
        return
    }

    const { data: booking } = await supabase
        .from('bookings')
        .select('id, email, status, total_amount_cents, affiliate_code')
        .eq('id', bookingId)
        .single()

    if (!booking) {
        console.warn('⚠️ invoice.paid: booking not found:', bookingId)
        return
    }

    // Find or create a DB invoice row to anchor the payment record.
    let dbInvoiceId: string | null = null

    const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existingInvoice) {
        dbInvoiceId = existingInvoice.id
    } else {
        const invoiceNum = stripeInvoice.number
            ? `EXT-${stripeInvoice.number}`
            : `EXT-${stripeInvoice.id.slice(-8).toUpperCase()}`

        const { data: created } = await supabase
            .from('invoices')
            .insert({
                booking_id: bookingId,
                invoice_number: invoiceNum,
                invoice_type: 'standard',
                date: paidAt.slice(0, 10),
                total: amountPaid,
                amount_due: 0,
                status: 'paid',
                payment_method: 'Stripe',
                paid_at: paidAt,
            })
            .select('id')
            .single()

        if (created) dbInvoiceId = created.id
    }

    if (dbInvoiceId) {
        await supabase.from('invoice_payments').insert({
            invoice_id: dbInvoiceId,
            amount: amountPaid,
            method: 'Stripe',
            paid_at: paidAt,
            notes: noteKey,
        })
        await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: paidAt })
            .eq('id', dbInvoiceId)
    }

    // Determine whether this covers the full balance or just a deposit.
    const totalCents = booking.total_amount_cents || Math.round(amountPaid * 100)
    const paidCents = Math.round(amountPaid * 100)
    const isFullPayment = paidCents >= totalCents

    const bookingUpdate: Record<string, any> = {}

    if (!booking.total_amount_cents) {
        bookingUpdate.total_amount_cents = paidCents
    }

    if (isFullPayment && booking.status !== 'paid') {
        bookingUpdate.status = 'paid'
        bookingUpdate.paid_at = paidAt
    } else if (!isFullPayment && booking.status !== 'paid' && booking.status !== 'deposit_paid') {
        bookingUpdate.status = 'deposit_paid'
        bookingUpdate.deposit_amount_cents = paidCents
        bookingUpdate.deposit_paid_at = paidAt
    }

    if (Object.keys(bookingUpdate).length > 0) {
        await supabase.from('bookings').update(bookingUpdate).eq('id', bookingId)
    }

    console.log('✅ invoice.paid finalized for booking:', bookingId, {
        stripeInvoiceId: stripeInvoice.id,
        amountPaid,
        isFullPayment,
        bookingUpdate,
    })

    // Trigger affiliate commission on full payment.
    if (isFullPayment && booking.email && amountPaid > 0) {
        try {
            const grossAmount = (Number(booking.total_amount_cents) || paidCents) / 100
            const result = await triggerReferralCommission(supabase, {
                email: booking.email,
                source: 'booking',
                sourceId: bookingId,
                grossAmount,
                fallbackAffiliateCode: booking.affiliate_code || null,
            })
            if (result.triggered) {
                console.log('✅ Booking commission from Stripe invoice:', { bookingId, amount: result.amount })
            }
        } catch (commissionErr: any) {
            console.error('⚠️ Commission trigger failed:', commissionErr?.message)
        }
    }
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
