import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFourthwallProducts } from '../../lib/fourthwall/handler'

/**
 * API endpoint to fetch products from Fourthwall
 * This proxies requests to avoid CORS issues
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return handleFourthwallProducts(req, res)
}
