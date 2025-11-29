import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const handlerModule = await import('../../../lib/api-handlers/_fourthwall-products-handler')
  return handlerModule.default(req, res)
}
