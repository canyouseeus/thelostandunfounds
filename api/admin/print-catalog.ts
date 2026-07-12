import type { VercelRequest, VercelResponse } from '@vercel/node'
import adminPrintCatalogHandler from '../../lib/api-handlers/_admin-print-catalog-handler.js'

/**
 * CRUD for the universal print size/frame menu. See _admin-print-catalog-handler.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return adminPrintCatalogHandler(req, res)
}
