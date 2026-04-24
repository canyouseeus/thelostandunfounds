import type { VercelRequest, VercelResponse } from '@vercel/node'

const STRIKE_API_URL = 'https://api.strike.me'

async function getBtcPriceUsd(): Promise<number> {
    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            { signal: AbortSignal.timeout(5000) }
        )
        const data = await res.json()
        const price = data?.bitcoin?.usd
        if (typeof price === 'number' && price > 0) return price
    } catch {
        // fall through to backup
    }
    try {
        const res = await fetch('https://api.coincap.io/v2/assets/bitcoin', {
            signal: AbortSignal.timeout(5000),
        })
        const data = await res.json()
        const price = parseFloat(data?.data?.priceUsd)
        if (!isNaN(price) && price > 0) return price
    } catch {
        // fall through to hardcoded fallback
    }
    // Hardcoded fallback — used only if both APIs are unreachable
    return 100000
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { amountSats, description } = req.body

    const sats = parseInt(amountSats, 10)
    if (!sats || sats < 100 || sats > 1_000_000) {
        return res.status(400).json({ error: 'amountSats must be between 100 and 1,000,000' })
    }

    const strikeApiKey = process.env.STRIKE_API_KEY
    if (!strikeApiKey) {
        console.error('❌ STRIKE_API_KEY not configured')
        return res.status(500).json({ error: 'Payment service not configured' })
    }

    const btcPrice = await getBtcPriceUsd()
    // sats → BTC → USD, enforce $0.01 minimum
    const amountUsd = Math.max((sats / 100_000_000) * btcPrice, 0.01)

    const correlationId = `zap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    console.log('⚡ Zap request:', { sats, amountUsd: amountUsd.toFixed(4), btcPrice })

    const invoiceResponse = await fetch(`${STRIKE_API_URL}/v1/invoices`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${strikeApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            correlationId,
            description: description || '⚡ Nostr Zap — THE LOST+UNFOUNDS',
            amount: {
                amount: amountUsd.toFixed(4),
                currency: 'USD',
            },
        }),
    })

    if (!invoiceResponse.ok) {
        const errText = await invoiceResponse.text()
        console.error('❌ Strike invoice failed:', invoiceResponse.status, errText.substring(0, 200))
        return res.status(500).json({ error: 'Failed to create invoice' })
    }

    const invoice = await invoiceResponse.json()

    const quoteResponse = await fetch(
        `${STRIKE_API_URL}/v1/invoices/${invoice.invoiceId}/quote`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${strikeApiKey}`,
                'Content-Type': 'application/json',
            },
        }
    )

    if (!quoteResponse.ok) {
        console.error('❌ Strike quote failed:', quoteResponse.status)
        return res.status(500).json({ error: 'Failed to generate Lightning invoice' })
    }

    const quote = await quoteResponse.json()

    console.log('✅ Zap invoice created:', { invoiceId: invoice.invoiceId, sats, amountUsd })

    return res.status(200).json({
        success: true,
        invoiceId: invoice.invoiceId,
        lnInvoice: quote.lnInvoice,
        expirationInSec: quote.expirationInSec,
        amountSats: sats,
        amountUsd,
        btcPrice,
    })
}
