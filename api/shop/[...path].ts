import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract route from path parameter (Vercel catch-all)
  // For /api/shop/fourthwall/products, req.query.path should be ['fourthwall', 'products']
  let route = ''
  
  // First try query.path (Vercel catch-all parameter)
  if (req.query.path) {
    if (Array.isArray(req.query.path)) {
      route = req.query.path.join('/')
    } else {
      route = req.query.path
    }
  }
  
  // Fallback: extract from URL
  if (!route && req.url) {
    const urlPath = req.url.split('?')[0]
    const pathParts = urlPath.split('/').filter(p => p)
    // Find 'shop' index and get everything after it
    const shopIndex = pathParts.indexOf('shop')
    if (shopIndex >= 0 && shopIndex < pathParts.length - 1) {
      route = pathParts.slice(shopIndex + 1).join('/')
    }
  }

  console.log('Shop router - query:', JSON.stringify(req.query), 'query.path:', req.query.path, 'route:', route, 'url:', req.url, 'method:', req.method)

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
