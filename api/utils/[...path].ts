import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract route from path parameter (Vercel catch-all)
  let route = ''
  if (req.query.path) {
    route = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
  } else {
    // Fallback: extract from URL
    const urlPath = req.url?.split('?')[0] || ''
    const pathParts = urlPath.split('/').filter(p => p)
    const apiIndex = pathParts.indexOf('api')
    const utilsIndex = pathParts.indexOf('utils')
    const routeParts = pathParts.slice(Math.max(apiIndex, utilsIndex) + 1)
    route = routeParts.join('/')
  }

  // Route to appropriate handler
  switch (route) {
    case 'signup':
      return handleSignup(req, res)
    default:
      return res.status(404).json({ error: `Utils route not found: ${route}` })
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_signup-handler')
  return handler.default(req, res)
}
