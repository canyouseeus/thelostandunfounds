import type { VercelRequest, VercelResponse } from '@vercel/node'
import photoPrintCheckoutHandler from '../../lib/api-handlers/_photo-print-checkout-handler.js'

/**
 * POST /api/prodigi/photo-print-checkout
 * Creates a Stripe Checkout Session to print any gallery photo.
 * See _photo-print-checkout-handler.ts for the full body schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return photoPrintCheckoutHandler(req, res)
}
