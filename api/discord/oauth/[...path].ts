import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const handler = await import('../../../lib/api-handlers/_discord-oauth-handler')
  return handler.default(req, res)
}
