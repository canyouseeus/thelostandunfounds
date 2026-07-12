import type { VercelRequest, VercelResponse } from '@vercel/node'
import adminProdigiProductsHandler from '../../lib/api-handlers/_admin-prodigi-products-handler.js'

/**
 * CRUD for the Prodigi print catalog. See _admin-prodigi-products-handler.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return adminProdigiProductsHandler(req, res)
}
