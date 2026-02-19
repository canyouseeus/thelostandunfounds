import strikeWebhookHandler from '../../lib/api-handlers/_strike-webhook-handler.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Strike Webhook Endpoint
 * 
 * Receives POST webhooks from Strike for invoice state changes.
 * Register this URL in your Strike Dashboard webhook settings:
 * https://www.thelostandunfounds.com/api/webhooks/strike
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    return strikeWebhookHandler(req, res)
}
