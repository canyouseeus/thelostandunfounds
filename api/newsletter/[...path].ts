import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query
  const route = Array.isArray(path) ? path[0] : path

  console.log('Newsletter router - path:', path, 'route:', route, 'method:', req.method)

  // Route to appropriate handler
  try {
    switch (route) {
      case 'send':
        return await handleNewsletterSend(req, res)
      case 'subscribe':
        return await handleNewsletterSubscribe(req, res)
      default:
        return res.status(404).json({ error: `Newsletter route not found: ${route}` })
    }
  } catch (error: any) {
    console.error('Newsletter router error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

// Import and re-export newsletter-send handler
async function handleNewsletterSend(req: VercelRequest, res: VercelResponse) {
  try {
    const handler = await import('../../lib/api-handlers/_newsletter-send-handler')
    return await handler.default(req, res)
  } catch (error: any) {
    console.error('Error importing newsletter-send handler:', error)
    throw error
  }
}

// Import and re-export newsletter-subscribe handler
async function handleNewsletterSubscribe(req: VercelRequest, res: VercelResponse) {
  try {
    const handler = await import('../../lib/api-handlers/_newsletter-subscribe-handler')
    return await handler.default(req, res)
  } catch (error: any) {
    console.error('Error importing newsletter-subscribe handler:', error)
    throw error
  }
}
