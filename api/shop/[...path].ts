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
    const shopIndex = pathParts.indexOf('shop')
    const routeParts = pathParts.slice(Math.max(apiIndex, shopIndex) + 1)
    route = routeParts.join('/')
  }

  console.log('Shop router - query.path:', req.query.path, 'route:', route, 'url:', req.url)

  // Route to appropriate handler
  switch (route) {
    case 'fourthwall/products':
      return handleFourthwallProducts(req, res)
    case 'affiliates/track-click':
      return handleAffiliatesTrackClick(req, res)
    case 'payments/paypal':
      return handlePaymentsPaypal(req, res)
    case 'king-midas/distribute':
      return handleKingMidasDistribute(req, res)
    default:
      return res.status(404).json({ error: `Shop route not found: ${route}` })
  }
}

async function handleFourthwallProducts(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_fourthwall-products-handler')
  return handler.default(req, res)
}

async function handleAffiliatesTrackClick(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_affiliates-track-click-handler')
  return handler.default(req, res)
}

async function handlePaymentsPaypal(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_payments-paypal-handler')
  return handler.default(req, res)
}

async function handleKingMidasDistribute(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_king-midas-distribute-handler')
  return handler.default(req, res)
}
