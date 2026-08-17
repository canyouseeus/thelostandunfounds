import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * Stripe Payment Handler
 *
 * Creates a Stripe Checkout Session for a single line-item purchase.
 * The customer is redirected to Stripe's hosted checkout page where they
 * pay with card (and any other payment methods enabled in the Stripe
 * Dashboard for this account). On success, Stripe redirects back to
 * STRIPE_SUCCESS_URL; the actual order finalization happens in the
 * webhook handler (checkout.session.completed).
 *
 * POST: Create a session → returns { id, url } so the client can redirect.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Affiliate-Ref')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY
        if (!stripeSecretKey) {
            console.error('❌ STRIPE_SECRET_KEY not configured')
            return res.status(500).json({ error: 'Stripe payment service not configured' })
        }

        const stripe = new Stripe(stripeSecretKey, {
            // Pin the API version so behavior doesn't drift under us.
            apiVersion: '2024-12-18.acacia' as any,
            typescript: true,
        })

        const { amount, currency = 'USD', description, productId, variantId } = req.body

        console.log('📥 Stripe checkout request received:', {
            amount,
            currency,
            productId,
            hasAffiliateRef: !!getAffiliateRefFromRequest(req),
        })

        if (!amount || amount <= 0) {
            console.warn('⚠️ Invalid amount:', amount)
            return res.status(400).json({ error: 'amount is required and must be greater than 0' })
        }

        // Get affiliate reference from cookie/headers
        const affiliateRef = getAffiliateRefFromRequest(req)

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

        // Supabase is only used below for best-effort bookkeeping (product cost
        // lookup + affiliate commission pre-record). Taking the payment itself
        // needs nothing but Stripe, so missing database config degrades those
        // extras instead of refusing the sale.
        const supabase =
            supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

        if (!supabase) {
            console.warn('⚠️ Supabase not configured; checkout continues without commission tracking')
        }

        // Get product cost if productId provided (for affiliate commission math).
        // Best-effort: this only feeds commission math, so a database outage
        // must not stop a customer from paying. Fall back to a zero cost.
        let productCost = 0
        if (productId && supabase) {
            try {
                const { data: costData } = await supabase
                    .from('product_costs')
                    .select('cost')
                    .eq('product_id', productId)
                    .eq('variant_id', variantId || '')
                    .eq('source', 'local')
                    .single()

                productCost = costData?.cost || 0
            } catch (costError: any) {
                console.error('⚠️ Product cost lookup failed (checkout continues):', {
                    productId,
                    message: costError?.message,
                })
            }
        }

        // Build success/cancel URLs from env, falling back to a sensible default
        // based on the request's host. Stripe appends ?session_id={CHECKOUT_SESSION_ID}
        // to the success URL when we use the placeholder below.
        const origin = (
            process.env.SITE_URL ||
            (req.headers['x-forwarded-proto'] && req.headers['host']
                ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
                : 'https://www.thelostandunfounds.com')
        ).replace(/\/$/, '')

        const successUrl =
            process.env.STRIPE_SUCCESS_URL ||
            `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`
        const cancelUrl =
            process.env.STRIPE_CANCEL_URL ||
            `${origin}/?payment=cancelled`

        // Stripe wants amounts in the smallest currency unit (cents for USD).
        const unitAmount = Math.round(Number(amount) * 100)

        // Create the Checkout Session.
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            // payment_method_types is deliberately omitted so Checkout uses the
            // account's Dashboard payment method configuration. Hardcoding
            // ['card'] overrides it and drops Link, Cash App, Klarna and Amazon
            // Pay: all enabled on this account and offered by its payment
            // links, but never by the site. (Apple/Google Pay ride along with
            // card either way.)
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: currency.toLowerCase(),
                        unit_amount: unitAmount,
                        product_data: {
                            name: description || 'THE LOST+UNFOUNDS Purchase',
                        },
                    },
                },
            ],
            // Anything we want to recover in the webhook goes in metadata;
            // Stripe will echo this back on checkout.session.completed.
            metadata: {
                productId: productId || '',
                variantId: variantId || '',
                affiliateRef: affiliateRef || '',
                productCost: String(productCost),
                source: 'tlau-shop',
            },
            // Also stamp it on the PaymentIntent so it's visible in the dashboard.
            payment_intent_data: {
                description: description || 'THE LOST+UNFOUNDS Purchase',
                metadata: {
                    productId: productId || '',
                    variantId: variantId || '',
                    affiliateRef: affiliateRef || '',
                },
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
        })

        console.log('✅ Stripe checkout session created:', {
            sessionId: session.id,
            url: session.url,
            amount: unitAmount,
            currency,
        })

        // Pre-record a pending affiliate commission. The webhook flips it to
        // confirmed once Stripe tells us the session was paid.
        //
        // This runs AFTER the Checkout Session already exists, so it must never
        // be able to fail the request: if the database is unreachable (e.g. a
        // paused Supabase project) an unhandled throw here would return a 500
        // and strand the customer on our side of a session Stripe already
        // created: losing a sale to bookkeeping. Commission tracking is
        // best-effort; the webhook reconciles from Stripe metadata regardless.
        if (affiliateRef && supabase) {
            try {
                const { data: affiliate } = await supabase
                    .from('affiliates')
                    .select('id, commission_rate')
                    .eq('code', affiliateRef)
                    .eq('status', 'active')
                    .single()

                if (affiliate) {
                    const profit = Number(amount) - productCost
                    const commissionRate = affiliate.commission_rate / 100
                    const commission = profit * commissionRate

                    await supabase
                        .from('affiliate_commissions')
                        .insert({
                            affiliate_id: affiliate.id,
                            order_id: session.id,
                            amount: commission,
                            profit_generated: profit,
                            source: 'stripe',
                            product_cost: productCost,
                            status: 'pending',
                        })
                }
            } catch (affiliateError: any) {
                console.error('⚠️ Affiliate commission pre-record failed (checkout continues):', {
                    sessionId: session.id,
                    affiliateRef,
                    message: affiliateError?.message,
                })
            }
        }

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            amount: { amount: Number(amount).toFixed(2), currency: currency.toUpperCase() },
            description: description || 'THE LOST+UNFOUNDS Purchase',
        })
    } catch (error: any) {
        console.error('🔥 Error creating Stripe payment:', error)
        return res.status(500).json({
            error: 'Payment creation failed',
            details: error?.message || 'Unknown error',
        })
    }
}

/**
 * Get affiliate reference from request (cookie or header).
 * Same shape as the Strike handler.
 */
function getAffiliateRefFromRequest(req: VercelRequest): string | null {
    const cookies = req.headers.cookie || ''
    const cookieMatch = cookies.match(/affiliate_ref=([^;]+)/)
    if (cookieMatch) {
        return cookieMatch[1]
    }

    const affiliateHeader = req.headers['x-affiliate-ref'] as string
    if (affiliateHeader) {
        return affiliateHeader
    }

    return null
}
