import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract path from URL
  const urlPath = req.url?.split('?')[0] || ''
  const pathParts = urlPath.split('/').filter(p => p)
  const route = pathParts[pathParts.length - 1] || ''

  // Route to appropriate handler
  switch (route) {
    case 'fourthwall':
      return handleFourthwallWebhook(req, res)
    default:
      return res.status(404).json({ error: `Webhook route not found: ${route}` })
  }
}

async function handleFourthwallWebhook(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_webhook-fourthwall-handler')
  return handler.default(req, res)
}
