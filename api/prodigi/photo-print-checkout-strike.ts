import type { VercelRequest, VercelResponse } from '@vercel/node'
import photoPrintCheckoutStrikeHandler from '../../lib/api-handlers/_photo-print-checkout-strike-handler.js'

/**
 * POST /api/prodigi/photo-print-checkout-strike
 * Creates a Strike (Bitcoin Lightning) invoice to print any gallery photo.
 * See _photo-print-checkout-strike-handler.ts for the full body schema.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return photoPrintCheckoutStrikeHandler(req, res)
}
