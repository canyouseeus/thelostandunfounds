import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * Create a Stripe Checkout Session for a one-time payment keyed by a
 * pre-existing Stripe Price ID (e.g., Mystery Box: price_1TX8dOF4xIdsehKGoawhJZD1).
 *
 * Request body:
 *   priceId      string   required — Stripe Price ID
 *   quantity?    number   default 1
 *   productKind? 'physical' | 'digital'   default 'physical'
 *   customerEmail? string   if known, prefilled on the Checkout page
 *
 * Returns: { sessionId, url } — the caller redirects the browser to `url`.
 *
 * A pending row is pre-inserted into shop_orders so the webhook can find
 * the order by stripe_session_id. The webhook flips status to 'paid' and
 * stamps the customer_id and amount_total.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Affiliate-Ref')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
        console.error('❌ STRIPE_SECRET_KEY not configured')
        return res.status(500).json({ error: 'Stripe not configured' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase not configured')
        return res.status(500).json({ error: 'Database not configured' })
    }

    try {
        const {
            priceId,
            quantity = 1,
            productKind = 'physical',
            customerEmail,
            productId,
        } = (req.body || {}) as {
            priceId?: string
            quantity?: number
            productKind?: 'physical' | 'digital'
            customerEmail?: string
            productId?: string
        }

        if (!priceId || typeof priceId !== 'string' || !priceId.startsWith('price_')) {
            return res.status(400).json({ error: 'priceId is required and must be a Stripe Price ID (price_...)' })
        }
        if (productKind !== 'physical' && productKind !== 'digital') {
            return res.status(400).json({ error: 'productKind must be "physical" or "digital"' })
        }
        const qty = Math.max(1, Math.min(100, Math.floor(Number(quantity) || 1)))

        const affiliateRef = getAffiliateRefFromRequest(req)
        const stripe = new Stripe(stripeSecretKey, { typescript: true })
        const supabase = createClient(supabaseUrl, supabaseKey)

        const origin = (
            process.env.SITE_URL ||
            (req.headers['x-forwarded-proto'] && req.headers['host']
                ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
                : 'https://www.thelostandunfounds.com')
        ).replace(/\/$/, '')

        const successUrl = `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`
        const cancelUrl = `${origin}/shop`

        // Pre-create a pending order so the webhook only has to flip it.
        // We don't have the session id yet, so seed a placeholder and update
        // it after the Stripe call.
        const placeholderSessionId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        const { data: pendingOrder, error: insertError } = await supabase
            .from('shop_orders')
            .insert({
                stripe_session_id: placeholderSessionId,
                price_id: priceId,
                product_id: productId || null,
                product_kind: productKind,
                quantity: qty,
                customer_email: customerEmail || null,
                affiliate_ref: affiliateRef,
                status: 'pending',
                metadata: { source: 'tlau-shop-checkout' },
            })
            .select()
            .single()

        if (insertError || !pendingOrder) {
            console.error('❌ Failed to pre-create shop_orders row:', insertError)
            return res.status(500).json({ error: 'Failed to create order' })
        }

        // For physical goods Stripe needs to collect shipping; for digital we skip it.
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: priceId, quantity: qty }],
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            ...(productKind === 'physical'
                ? { shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] } }
                : {}),
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                source: 'tlau-shop-checkout',
                shopOrderId: pendingOrder.id,
                priceId,
                productId: productId || '',
                productKind,
                affiliateRef: affiliateRef || '',
            },
            payment_intent_data: {
                metadata: {
                    source: 'tlau-shop-checkout',
                    shopOrderId: pendingOrder.id,
                    productKind,
                    affiliateRef: affiliateRef || '',
                },
            },
        })

        // Stamp the real session id so the webhook can match.
        const { error: updateError } = await supabase
            .from('shop_orders')
            .update({ stripe_session_id: session.id })
            .eq('id', pendingOrder.id)

        if (updateError) {
            console.error('❌ Failed to update shop_orders.stripe_session_id:', updateError)
            // Non-fatal: the metadata.shopOrderId is the authoritative join key.
        }

        console.log('✅ Checkout session created:', {
            sessionId: session.id,
            shopOrderId: pendingOrder.id,
            priceId,
            productKind,
            quantity: qty,
        })

        return res.status(200).json({
            sessionId: session.id,
            url: session.url,
            shopOrderId: pendingOrder.id,
        })
    } catch (error: any) {
        console.error('🔥 create-session error:', error)
        return res.status(500).json({
            error: 'Failed to create checkout session',
            details: error?.message || 'Unknown error',
        })
    }
}

function getAffiliateRefFromRequest(req: VercelRequest): string | null {
    const cookies = req.headers.cookie || ''
    const cookieMatch = cookies.match(/affiliate_ref=([^;]+)/)
    if (cookieMatch) return cookieMatch[1]
    const headerVal = req.headers['x-affiliate-ref']
    if (typeof headerVal === 'string' && headerVal) return headerVal
    return null
}
