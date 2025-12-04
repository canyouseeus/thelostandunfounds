import type { VercelRequest, VercelResponse } from '@vercel/node'
import discordWebhookHandler from '../../lib/api-handlers/_discord-webhook-handler'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return discordWebhookHandler(req, res)
}
