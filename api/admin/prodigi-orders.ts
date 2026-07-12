import type { VercelRequest, VercelResponse } from '@vercel/node'
import adminProdigiOrdersHandler from '../../lib/api-handlers/_admin-prodigi-orders-handler.js'

/**
 * GET list of Prodigi fulfillment orders. See _admin-prodigi-orders-handler.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return adminProdigiOrdersHandler(req, res)
}
