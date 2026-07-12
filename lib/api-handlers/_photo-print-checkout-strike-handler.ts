import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STRIKE_API_URL = 'https://api.strike.me'

/**
 * POST /api/prodigi/photo-print-checkout-strike
 *
 * Strike (Bitcoin Lightning) checkout for a print of any gallery photo.
 * Mirrors _prodigi-checkout-strike-handler.ts's shipping-address-up-front
 * requirement (Strike has no hosted address step) but resolves SKU/pricing
 * dynamically from print_catalog_options instead of a pre-seeded product.
 *
 * Body: { photoId, printOptionId, orientation, matSelected?, recipient: {...} }
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
        const { photoId, printOptionId, orientation, matSelected = false, recipient } = (req.body || {}) as {
            photoId?: string
            printOptionId?: string
            orientation?: 'landscape' | 'portrait'
            matSelected?: boolean
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

        if (!photoId || !printOptionId) return res.status(400).json({ error: 'photoId and printOptionId are required' })
        if (orientation !== 'landscape' && orientation !== 'portrait') {
            return res.status(400).json({ error: 'orientation must be "landscape" or "portrait"' })
        }
        if (!recipient?.name || !recipient?.email || !recipient?.address?.line1 ||
            !recipient?.address?.postalOrZipCode || !recipient?.address?.countryCode || !recipient?.address?.townOrCity) {
            return res.status(400).json({ error: 'A complete recipient name, email, and shipping address are required' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const [{ data: photo, error: photoError }, { data: option, error: optionError }] = await Promise.all([
            supabase.from('photos').select('id, title, google_drive_file_id').eq('id', photoId).single(),
            supabase.from('print_catalog_options').select('*').eq('id', printOptionId).eq('status', 'active').single(),
        ])

        if (photoError || !photo) return res.status(404).json({ error: 'Photo not found' })
        if (optionError || !option) return res.status(404).json({ error: 'Print option not found' })

        const sku = orientation === 'landscape' ? option.sku_landscape : option.sku_portrait
        const useMat = option.framed && option.mat_available && !!matSelected

        const affiliateRef = getAffiliateRefFromRequest(req)
        const correlationId = `photo-print-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

        const origin = process.env.SITE_URL || 'https://www.thelostandunfounds.com'
        const assetUrl = `${origin.replace(/\/$/, '')}/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=4096`

        const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${strikeApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correlationId,
                description: `${photo.title} — ${option.size_label}`,
                amount: { amount: Number(option.price).toFixed(2), currency: (option.currency || 'USD').toUpperCase() },
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
            product_id: null,
            photo_id: photoId,
            print_option_id: printOptionId,
            orientation,
            mat_selected: useMat,
            sku,
            copies: 1,
            unit_cost: option.base_cost,
            unit_price: option.price,
            currency: option.currency || 'USD',
            customer_email: recipient.email,
            recipient: { name: recipient.name, email: recipient.email, address: recipient.address },
            asset_url: assetUrl,
            affiliate_ref: affiliateRef,
            status: 'pending_payment',
        })

        if (prodigiInsertError) {
            console.error('❌ Failed to create prodigi_orders row for photo print (strike):', prodigiInsertError)
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
        console.error('🔥 Photo print Strike checkout error:', error)
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
