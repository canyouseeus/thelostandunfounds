import type { VercelRequest, VercelResponse } from '@vercel/node'

// Configure to receive raw body for signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const handler = await import('../../lib/api-handlers/_discord-interactions-handler')
  return handler.default(req, res)
}
