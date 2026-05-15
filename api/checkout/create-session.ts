import type { VercelRequest, VercelResponse } from '@vercel/node'
import createSessionHandler from '../../lib/api-handlers/_checkout-create-session-handler.js'

/**
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout Session for a one-time payment using a
 * pre-existing Stripe Price ID. See _checkout-create-session-handler.ts
 * for the full body schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return createSessionHandler(req, res)
}
