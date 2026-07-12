import type { VercelRequest, VercelResponse } from '@vercel/node'
import prodigiCheckoutHandler from '../../lib/api-handlers/_prodigi-checkout-handler.js'

/**
 * POST /api/prodigi/checkout
 * Creates a Stripe Checkout Session for a Prodigi print-on-demand product.
 * See _prodigi-checkout-handler.ts for the full body schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return prodigiCheckoutHandler(req, res)
}
