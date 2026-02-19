import { VercelRequest, VercelResponse } from '@vercel/node'

const STRIKE_API_URL = 'https://api.strike.me'

/**
 * Strike Payment Status Handler
 * 
 * Polls Strike invoice status so the frontend can detect when payment completes.
 * GET: Check invoice status by invoiceId query param
 * 
 * Invoice states: UNPAID, PENDING, PAID, CANCELLED
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const strikeApiKey = process.env.STRIKE_API_KEY
        if (!strikeApiKey) {
            return res.status(500).json({ error: 'Strike payment service not configured' })
        }

        const invoiceId = req.query.invoiceId as string
        if (!invoiceId) {
            return res.status(400).json({ error: 'invoiceId query parameter is required' })
        }

        // Fetch invoice status from Strike
        const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices/${invoiceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${strikeApiKey}`,
                'Content-Type': 'application/json',
            },
        })

        if (!invoiceResponse.ok) {
            if (invoiceResponse.status === 404) {
                return res.status(404).json({ error: 'Invoice not found' })
            }
            const errorText = await invoiceResponse.text()
            console.error('❌ Strike invoice status check failed:', {
                status: invoiceResponse.status,
                body: errorText.substring(0, 500),
            })
            return res.status(500).json({ error: 'Failed to check invoice status' })
        }

        const invoice = await invoiceResponse.json()

        return res.status(200).json({
            invoiceId: invoice.invoiceId,
            state: invoice.state, // UNPAID, PENDING, PAID, CANCELLED
            amount: invoice.amount,
            description: invoice.description,
            created: invoice.created,
        })
    } catch (error: any) {
        console.error('🔥 Error checking Strike payment status:', error)
        return res.status(500).json({ error: 'Status check failed' })
    }
}
