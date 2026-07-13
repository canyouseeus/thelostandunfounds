import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * POST /api/prodigi/checkout
 *
 * Creates a Stripe Checkout Session for a Prodigi print-on-demand product.
 * Mirrors _checkout-create-session-handler.ts's shop_orders pre-insert
 * pattern, plus a linked prodigi_orders row that the Stripe webhook fills
 * in with the actual Prodigi order once payment succeeds (see
 * finalizeProdigiOrder in _stripe-webhook-handler.ts).
 *
 * Stripe collects the shipping address on its hosted checkout page
 * (shipping_address_collection), so no custom address form is needed here.
 *
 * Body: { productId: string (prodigi_products.id), quantity?: number, customerEmail?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Affiliate-Ref')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
        const { productId, quantity = 1, customerEmail } = (req.body || {}) as {
            productId?: string
            quantity?: number
            customerEmail?: string
        }

        if (!productId) {
            return res.status(400).json({ error: 'productId is required' })
        }
        const qty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)))

        const supabase = createClient(supabaseUrl, supabaseKey)
        const stripe = new Stripe(stripeSecretKey, { typescript: true })

        const { data: product, error: productError } = await supabase
            .from('prodigi_products')
            .select('*')
            .eq('id', productId)
            .eq('status', 'active')
            .single()

        if (productError || !product) {
            return res.status(404).json({ error: 'Product not found' })
        }

        const affiliateRef = getAffiliateRefFromRequest(req)

        const origin = (
            process.env.SITE_URL ||
            (req.headers['x-forwarded-proto'] && req.headers['host']
                ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
                : 'https://www.thelostandunfounds.com')
        ).replace(/\/$/, '')

        const successUrl = `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`
        const cancelUrl = `${origin}/shop`

        const placeholderSessionId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

        const { data: pendingOrder, error: insertError } = await supabase
            .from('shop_orders')
            .insert({
                stripe_session_id: placeholderSessionId,
                price_id: product.stripe_price_id || 'inline',
                product_id: product.id,
                product_kind: 'physical',
                quantity: qty,
                customer_email: customerEmail || null,
                affiliate_ref: affiliateRef,
                status: 'pending',
                metadata: { source: 'tlau-prodigi-checkout', prodigiSku: product.sku },
            })
            .select()
            .single()

        if (insertError || !pendingOrder) {
            console.error('❌ Failed to pre-create shop_orders row:', insertError)
            return res.status(500).json({ error: 'Failed to create order' })
        }

        const lineItem = product.stripe_price_id
            ? { price: product.stripe_price_id, quantity: qty }
            : {
                quantity: qty,
                price_data: {
                    currency: (product.currency || 'USD').toLowerCase(),
                    unit_amount: Math.round(Number(product.price) * 100),
                    product_data: { name: product.title },
                },
            }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [lineItem as any],
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                source: 'tlau-prodigi-checkout',
                shopOrderId: pendingOrder.id,
                prodigiProductId: product.id,
                productKind: 'physical',
                affiliateRef: affiliateRef || '',
            },
            payment_intent_data: {
                metadata: {
                    source: 'tlau-prodigi-checkout',
                    shopOrderId: pendingOrder.id,
                    affiliateRef: affiliateRef || '',
                },
            },
        })

        await supabase.from('shop_orders').update({ stripe_session_id: session.id }).eq('id', pendingOrder.id)

        // Pre-create the linked prodigi_orders row. The webhook fills in
        // recipient (from session.shipping_details) and submits to Prodigi.
        const { error: prodigiInsertError } = await supabase.from('prodigi_orders').insert({
            payment_source: 'stripe',
            payment_ref: session.id,
            shop_order_id: pendingOrder.id,
            product_id: product.id,
            sku: product.sku,
            copies: qty,
            unit_cost: product.base_cost,
            unit_price: product.price,
            currency: product.currency || 'USD',
            customer_email: customerEmail || null,
            asset_url: product.image_url,
            affiliate_ref: affiliateRef,
            status: 'pending_payment',
            order_attributes: product.attributes || {},
        })

        if (prodigiInsertError) {
            console.error('❌ Failed to pre-create prodigi_orders row:', prodigiInsertError)
            // Non-fatal for the customer — the payment can still proceed; the
            // webhook will log the mismatch if it can't find this row.
        }

        return res.status(200).json({ sessionId: session.id, url: session.url, shopOrderId: pendingOrder.id })
    } catch (error: any) {
        console.error('🔥 Prodigi checkout error:', error)
        return res.status(500).json({ error: 'Failed to create checkout session', details: error?.message })
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
