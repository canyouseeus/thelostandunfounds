import type { VercelRequest, VercelResponse } from '@vercel/node'
import printCatalogHandler from '../../lib/api-handlers/_print-catalog-handler.js'

/**
 * GET /api/prodigi/print-catalog
 * Public size/frame menu + mockup templates for the "Order Print" flow.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return printCatalogHandler(req, res)
}
