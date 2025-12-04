import type { VercelRequest, VercelResponse } from '@vercel/node'
import discordOAuthHandler from '../../../lib/api-handlers/_discord-oauth-handler'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return discordOAuthHandler(req, res)
}
