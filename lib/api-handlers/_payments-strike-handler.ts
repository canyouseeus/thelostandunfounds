import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STRIKE_API_URL = 'https://api.strike.me'

/**
 * Strike Payment Handler
 * 
 * Creates Strike invoices for Bitcoin Lightning payments.
 * Customer pays in BTC via Lightning, merchant receives USD.
 * POST: Create a new invoice → returns invoiceId + Lightning invoice (bolt11) for QR code
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
        const strikeApiKey = process.env.STRIKE_API_KEY
        if (!strikeApiKey) {
            console.error('❌ STRIKE_API_KEY not configured')
            return res.status(500).json({ error: 'Strike payment service not configured' })
        }

        const { amount, currency = 'USD', description, productId, variantId } = req.body

        console.log('📥 Strike checkout request received:', {
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

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials')
            return res.status(500).json({ error: 'Database service not configured' })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get product cost if productId provided
        let productCost = 0
        if (productId) {
            const { data: costData } = await supabase
                .from('product_costs')
                .select('cost')
                .eq('product_id', productId)
                .eq('variant_id', variantId || '')
                .eq('source', 'local')
                .single()

            productCost = costData?.cost || 0
        }

        // Create a unique correlation ID for this order
        const correlationId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

        // Create Strike invoice
        // The invoice is created on YOUR Strike account - customer pays you
        const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${strikeApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                correlationId,
                description: description || 'THE LOST+UNFOUNDS Purchase',
                amount: {
                    amount: amount.toFixed(2),
                    currency: currency.toUpperCase(),
                },
            }),
        })

        if (!invoiceResponse.ok) {
            const errorText = await invoiceResponse.text()
            console.error('❌ Strike invoice creation failed:', {
                status: invoiceResponse.status,
                body: errorText.substring(0, 500),
            })
            return res.status(500).json({
                error: 'Failed to create Strike invoice',
                details: invoiceResponse.status === 401 ? 'Invalid API key' : 'Strike API error',
            })
        }

        const invoice = await invoiceResponse.json()
        console.log('✅ Strike invoice created:', {
            invoiceId: invoice.invoiceId,
            state: invoice.state,
            correlationId: invoice.correlationId,
        })

        // Now generate a Lightning quote for this invoice
        // This gives us the bolt11 Lightning invoice string for the QR code
        const quoteResponse = await fetch(`${STRIKE_API_URL}/v1/invoices/${invoice.invoiceId}/quote`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${strikeApiKey}`,
                'Content-Type': 'application/json',
            },
        })

        if (!quoteResponse.ok) {
            const errorText = await quoteResponse.text()
            console.error('❌ Strike quote generation failed:', {
                status: quoteResponse.status,
                body: errorText.substring(0, 500),
            })
            return res.status(500).json({
                error: 'Failed to generate Lightning invoice',
                details: 'Strike quote generation failed',
            })
        }

        const quote = await quoteResponse.json()
        console.log('⚡ Lightning quote generated:', {
            quoteId: quote.quoteId,
            expirationInSec: quote.expirationInSec,
            hasLnInvoice: !!quote.lnInvoice,
        })

        // Store order metadata in database for tracking
        if (affiliateRef) {
            const { data: affiliate } = await supabase
                .from('affiliates')
                .select('id, commission_rate')
                .eq('code', affiliateRef)
                .eq('status', 'active')
                .single()

            if (affiliate) {
                const profit = amount - productCost
                const commissionRate = affiliate.commission_rate / 100
                const commission = profit * commissionRate

                await supabase
                    .from('affiliate_commissions')
                    .insert({
                        affiliate_id: affiliate.id,
                        order_id: invoice.invoiceId,
                        amount: commission,
                        profit_generated: profit,
                        source: 'strike',
                        product_cost: productCost,
                        status: 'pending',
                    })
            }
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
        console.error('🔥 Error creating Strike payment:', error)
        return res.status(500).json({ error: 'Payment creation failed' })
    }
}

/**
 * Get affiliate reference from request (cookie or header)
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
