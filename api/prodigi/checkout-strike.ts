import type { VercelRequest, VercelResponse } from '@vercel/node'
import prodigiCheckoutStrikeHandler from '../../lib/api-handlers/_prodigi-checkout-strike-handler.js'

/**
 * POST /api/prodigi/checkout-strike
 * Creates a Strike (Bitcoin Lightning) invoice for a Prodigi print product.
 * See _prodigi-checkout-strike-handler.ts for the full body schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return prodigiCheckoutStrikeHandler(req, res)
}
