import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract path from URL
  const urlPath = req.url?.split('?')[0] || ''
  const pathParts = urlPath.split('/').filter(p => p)
  // Remove 'api' and 'utils' from path parts, join the rest
  const apiIndex = pathParts.indexOf('api')
  const utilsIndex = pathParts.indexOf('utils')
  const routeParts = pathParts.slice(Math.max(apiIndex, utilsIndex) + 1)
  const route = routeParts.join('/')

  // Route to appropriate handler
  switch (route) {
    case 'signup':
      return handleSignup(req, res)
    case 'sql/latest':
      return handleSqlLatest(req, res)
    default:
      return res.status(404).json({ error: `Utils route not found: ${route}` })
  }
}

async function handleSignup(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_signup-handler')
  return handler.default(req, res)
}

async function handleSqlLatest(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_sql-latest-handler')
  return handler.default(req, res)
}
