/**
 * Affiliate Track Click Handler
 * Dedicated route for /api/shop/affiliates/track-click
 */

import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const handlerModule = await import('../../../lib/api-handlers/_affiliates-track-click-handler.js')
  return handlerModule.default(req, res)
}

