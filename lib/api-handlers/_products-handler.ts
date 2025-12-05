import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFourthwallProducts } from '../fourthwall/handler'

/**
 * Products Handler
 * Fetches products from Fourthwall and returns them in the format expected by the Shop page
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Call the Fourthwall handler which returns { products: [...] }
  return handleFourthwallProducts(req, res)
}
