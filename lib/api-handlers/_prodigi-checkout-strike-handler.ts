import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STRIKE_API_URL = 'https://api.strike.me'

/**
 * POST /api/prodigi/checkout-strike
 *
 * Creates a Strike (Bitcoin Lightning) invoice for a Prodigi print product.
 * Unlike Stripe Checkout, Strike's hosted invoice has no address-collection
 * step, so the recipient's shipping address must be collected client-side
 * (see the shipping form in ProductModal) and passed in the request body.
 *
 * Body: { productId, recipient: { name, email, address: {...} } }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Affiliate-Ref')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const strikeApiKey = process.env.STRIKE_API_KEY
    if (!strikeApiKey) {
        console.error('❌ STRIKE_API_KEY not configured')
        return res.status(500).json({ error: 'Strike payment service not configured' })
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
        const { productId, recipient } = (req.body || {}) as {
            productId?: string
            recipient?: {
                name?: string
                email?: string
                address?: {
                    line1?: string
                    line2?: string
                    postalOrZipCode?: string
                    countryCode?: string
                    townOrCity?: string
                    stateOrCounty?: string
                }
            }
        }

        if (!productId) return res.status(400).json({ error: 'productId is required' })
        if (!recipient?.name || !recipient?.email || !recipient?.address?.line1 ||
            !recipient?.address?.postalOrZipCode || !recipient?.address?.countryCode || !recipient?.address?.townOrCity) {
            return res.status(400).json({ error: 'A complete recipient name, email, and shipping address are required' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

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
        const correlationId = `prodigi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

        const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${strikeApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correlationId,
                description: product.title,
                amount: { amount: Number(product.price).toFixed(2), currency: (product.currency || 'USD').toUpperCase() },
            }),
        })

        if (!invoiceResponse.ok) {
            const errorText = await invoiceResponse.text()
            console.error('❌ Strike invoice creation failed:', invoiceResponse.status, errorText.slice(0, 300))
            return res.status(500).json({ error: 'Failed to create Strike invoice' })
        }
        const invoice = await invoiceResponse.json()

        const quoteResponse = await fetch(`${STRIKE_API_URL}/v1/invoices/${invoice.invoiceId}/quote`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${strikeApiKey}`, 'Content-Type': 'application/json' },
        })
        if (!quoteResponse.ok) {
            console.error('❌ Strike quote generation failed:', quoteResponse.status)
            return res.status(500).json({ error: 'Failed to generate Lightning invoice' })
        }
        const quote = await quoteResponse.json()

        const { error: prodigiInsertError } = await supabase.from('prodigi_orders').insert({
            payment_source: 'strike',
            payment_ref: invoice.invoiceId,
            product_id: product.id,
            sku: product.sku,
            copies: 1,
            unit_cost: product.base_cost,
            unit_price: product.price,
            currency: product.currency || 'USD',
            customer_email: recipient.email,
            recipient: {
                name: recipient.name,
                email: recipient.email,
                address: recipient.address,
            },
            asset_url: product.image_url,
            affiliate_ref: affiliateRef,
            status: 'pending_payment',
        })

        if (prodigiInsertError) {
            console.error('❌ Failed to create prodigi_orders row for Strike invoice:', prodigiInsertError)
            return res.status(500).json({ error: 'Failed to record order' })
        }

        return res.status(200).json({
            success: true,
            invoiceId: invoice.invoiceId,
            lnInvoice: quote.lnInvoice,
            expirationInSec: quote.expirationInSec,
            amount: invoice.amount,
            description: invoice.description,
            correlationId,
        })
    } catch (error: any) {
        console.error('🔥 Prodigi Strike checkout error:', error)
        return res.status(500).json({ error: 'Payment creation failed', details: error?.message })
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
