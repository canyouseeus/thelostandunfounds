import type { VercelRequest, VercelResponse } from '@vercel/node'
import prodigiVerifyCatalogHandler from '../../lib/api-handlers/_prodigi-verify-catalog-handler.js'

/**
 * GET/POST /api/prodigi/verify-catalog
 * Admin-only: checks every catalog SKU against the live Prodigi API and
 * reports real cost/shipping. See _prodigi-verify-catalog-handler.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return prodigiVerifyCatalogHandler(req, res)
}
