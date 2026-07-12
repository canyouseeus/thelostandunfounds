import type { VercelRequest, VercelResponse } from '@vercel/node'
import prodigiQuoteHandler from '../../lib/api-handlers/_prodigi-quote-handler.js'

/**
 * POST /api/prodigi/quote
 * Proxies Prodigi's quote endpoint for shipping cost previews.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return prodigiQuoteHandler(req, res)
}
