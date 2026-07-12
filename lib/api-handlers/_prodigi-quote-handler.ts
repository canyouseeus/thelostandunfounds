import { VercelRequest, VercelResponse } from '@vercel/node'
import { getProdigiQuote } from './_prodigi-client.js'

/**
 * POST /api/prodigi/quote
 *
 * Thin proxy to Prodigi's quote endpoint so the client can show shipping
 * cost/method before checkout without exposing PRODIGI_API_KEY.
 *
 * Body: { sku, copies?, attributes?, destinationCountryCode, shippingMethod? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { sku, copies = 1, attributes, destinationCountryCode, shippingMethod } = req.body || {}

    if (!sku || !destinationCountryCode) {
        return res.status(400).json({ error: 'sku and destinationCountryCode are required' })
    }

    try {
        const quote = await getProdigiQuote({
            destinationCountryCode,
            shippingMethod,
            items: [{ sku, copies: Math.max(1, Math.min(20, Math.floor(Number(copies) || 1))), attributes }],
        })
        return res.status(200).json(quote)
    } catch (error: any) {
        console.error('❌ Prodigi quote failed:', error?.message || error)
        return res.status(500).json({ error: error?.message || 'Failed to get Prodigi quote' })
    }
}
