import type { VercelRequest, VercelResponse } from '@vercel/node'
import discordInteractionsHandler from '../../lib/api-handlers/_discord-interactions-handler'

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
  return discordInteractionsHandler(req, res)
}
