import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFourthwallProducts } from '../fourthwall/handler'

/**
 * Legacy handler - re-exported for backwards compatibility
 * This file is kept for backwards compatibility with api/shop/[...path].ts
 * 
 * @deprecated Use handleFourthwallProducts from lib/fourthwall/handler directly
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return handleFourthwallProducts(req, res)
}
