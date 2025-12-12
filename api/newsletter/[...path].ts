import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract route from path parameter (Vercel catch-all)
  // For /api/newsletter/[...path].ts, accessing /api/newsletter/send gives path=['send']
  let route = ''
  if (req.query.path) {
    route = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path
  } else {
    // Fallback: extract from URL
    const urlPath = req.url?.split('?')[0] || ''
    const pathParts = urlPath.split('/').filter(p => p)
    route = pathParts[pathParts.length - 1] || ''
  }

  console.log('Newsletter router - query.path:', req.query.path, 'route:', route, 'method:', req.method, 'url:', req.url)

  // Route to appropriate handler
  try {
    switch (route) {
      case 'send':
        return await handleNewsletterSend(req, res)
      case 'subscribe':
        return await handleNewsletterSubscribe(req, res)
      case 'retry':
        return await handleNewsletterRetry(req, res)
      case 'logs':
        return await handleNewsletterLogs(req, res)
      case 'delete':
        return await handleNewsletterDelete(req, res)
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
  const handler = await import('../../lib/api-handlers/_newsletter-send-handler.js')
  return await handler.default(req, res)
}

// Import and re-export newsletter-subscribe handler
async function handleNewsletterSubscribe(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-subscribe-handler.js')
  return await handler.default(req, res)
}

// Import and re-export newsletter-retry handler
async function handleNewsletterRetry(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-retry-handler.js')
  return await handler.default(req, res)
}

// Import and re-export newsletter-logs handler
async function handleNewsletterLogs(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-logs-handler.js')
  return await handler.default(req, res)
}

// Import and re-export newsletter-delete handler
async function handleNewsletterDelete(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_newsletter-delete-handler.js')
  return await handler.default(req, res)
}
