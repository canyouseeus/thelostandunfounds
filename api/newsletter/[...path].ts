import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query
  const route = Array.isArray(path) ? path[0] : path

  // Route to appropriate handler
  switch (route) {
    case 'send':
      return handleNewsletterSend(req, res)
    case 'subscribe':
      return handleNewsletterSubscribe(req, res)
    default:
      return res.status(404).json({ error: `Newsletter route not found: ${route}` })
  }
}

// Import and re-export newsletter-send handler
async function handleNewsletterSend(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-send-handler')
  return handler.default(req, res)
}

// Import and re-export newsletter-subscribe handler
async function handleNewsletterSubscribe(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-subscribe-handler')
  return handler.default(req, res)
}
