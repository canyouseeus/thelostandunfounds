import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * POST /api/prodigi/photo-print-checkout
 *
 * Print-on-demand checkout for ANY public gallery photo (not just the
 * curated prodigi_products catalog) — size + optional black frame + mat,
 * picked from print_catalog_options. Unlike _prodigi-checkout-handler.ts,
 * there's no pre-seeded product row per photo (that would mean one Stripe
 * product per photo x option, i.e. tens of thousands) — everything is
 * resolved dynamically and priced with an inline Stripe price_data block.
 *
 * The resulting prodigi_orders row is identical in shape to the curated-
 * catalog path, so it flows through the exact same webhook finalization,
 * Prodigi order submission, and affiliate commission code untouched.
 *
 * Body:
 *   photoId       string  required — photos.id
 *   printOptionId string  required — print_catalog_options.id
 *   orientation   'landscape' | 'portrait'  required — resolved client-side
 *                 from the photo's actual pixel dimensions, since that's
 *                 already loaded in the lightbox and used to fit the
 *                 artwork correctly on order submission (see order_attributes
 *                 / sizing in the webhook finalizer).
 *   customerEmail? string
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
        const { photoId, printOptionId, orientation, customerEmail } = (req.body || {}) as {
            photoId?: string
            printOptionId?: string
            orientation?: 'landscape' | 'portrait'
            customerEmail?: string
        }

        if (!photoId || !printOptionId) {
            return res.status(400).json({ error: 'photoId and printOptionId are required' })
        }
        if (orientation !== 'landscape' && orientation !== 'portrait') {
            return res.status(400).json({ error: 'orientation must be "landscape" or "portrait"' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
        const stripe = new Stripe(stripeSecretKey, { typescript: true })

        const [{ data: photo, error: photoError }, { data: option, error: optionError }] = await Promise.all([
            supabase.from('photos').select('id, title, google_drive_file_id').eq('id', photoId).single(),
            supabase.from('print_catalog_options').select('*').eq('id', printOptionId).eq('status', 'active').single(),
        ])

        if (photoError || !photo) return res.status(404).json({ error: 'Photo not found' })
        if (optionError || !option) return res.status(404).json({ error: 'Print option not found' })

        // Orientation picks which of the (now-identical) sku_landscape/
        // sku_portrait columns we read — kept as two columns since Prodigi
        // does offer real orientation-swapped SKUs for some product lines,
        // even though the ones in the current catalog turned out to be a
        // single physical shape (see order_attributes/sizing comment below).
        const sku = orientation === 'landscape' ? option.sku_landscape : option.sku_portrait

        // Real Prodigi product data (GET /v4.0/products/{sku}) showed the
        // classic frame's mount/mountColor attributes have exactly one valid
        // value each — there's no "no mount" choice, so a mat toggle was
        // never real and isn't offered. "color" is the one real per-order
        // choice; hardcoded to black (lowercase — Prodigi's enum is
        // lowercase) since the brand only offers black frames.
        const orderAttributes: Record<string, string> = option.framed ? { color: option.frame_color || 'black' } : {}

        const affiliateRef = getAffiliateRefFromRequest(req)

        const origin = (
            process.env.SITE_URL ||
            (req.headers['x-forwarded-proto'] && req.headers['host']
                ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
                : 'https://www.thelostandunfounds.com')
        ).replace(/\/$/, '')

        const assetUrl = `${origin}/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=4096`
        const productName = `${photo.title} — ${option.size_label}`

        const successUrl = `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`
        const cancelUrl = `${origin}/gallery`

        const placeholderSessionId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

        const { data: pendingOrder, error: insertError } = await supabase
            .from('shop_orders')
            .insert({
                stripe_session_id: placeholderSessionId,
                price_id: 'inline',
                product_id: null,
                product_kind: 'physical',
                quantity: 1,
                customer_email: customerEmail || null,
                affiliate_ref: affiliateRef,
                status: 'pending',
                metadata: { source: 'tlau-prodigi-checkout', photoId, printOptionId, sku },
            })
            .select()
            .single()

        if (insertError || !pendingOrder) {
            console.error('❌ Failed to pre-create shop_orders row:', insertError)
            return res.status(500).json({ error: 'Failed to create order' })
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: (option.currency || 'USD').toLowerCase(),
                        unit_amount: Math.round(Number(option.price) * 100),
                        product_data: { name: productName },
                    },
                },
            ],
            ...(customerEmail ? { customer_email: customerEmail } : {}),
            shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                source: 'tlau-prodigi-checkout',
                shopOrderId: pendingOrder.id,
                photoId,
                printOptionId,
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

        const { error: prodigiInsertError } = await supabase.from('prodigi_orders').insert({
            payment_source: 'stripe',
            payment_ref: session.id,
            shop_order_id: pendingOrder.id,
            product_id: null,
            photo_id: photoId,
            print_option_id: printOptionId,
            orientation,
            sku,
            copies: 1,
            unit_cost: option.base_cost,
            unit_price: option.price,
            currency: option.currency || 'USD',
            customer_email: customerEmail || null,
            asset_url: assetUrl,
            affiliate_ref: affiliateRef,
            status: 'pending_payment',
            order_attributes: orderAttributes,
        })

        if (prodigiInsertError) {
            console.error('❌ Failed to pre-create prodigi_orders row (photo print):', prodigiInsertError)
        }

        return res.status(200).json({ sessionId: session.id, url: session.url, shopOrderId: pendingOrder.id })
    } catch (error: any) {
        console.error('🔥 Photo print checkout error:', error)
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
