import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const mod = await import('../../lib/api-handlers/_defy-handler.js')
  return await mod.default(req, res)
}
