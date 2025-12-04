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
    case 'products':
      console.log('✅ Routing to products handler')
      return handleProducts(req, res)
    case 'fourthwall/products':
      // Deprecated: Keep for backward compatibility but redirect to native products
      console.log('✅ Routing to products handler (fourthwall fallback)')
      return handleProducts(req, res)
    case 'affiliates/track-click':
      console.log('✅ Routing to affiliates/track-click handler')
      return handleAffiliatesTrackClick(req, res)
    case 'payments/paypal':
      console.log('✅ Routing to payments/paypal handler')
      return handlePaymentsPaypal(req, res)
    case 'king-midas/distribute':
      console.log('✅ Routing to king-midas/distribute handler')
      return handleKingMidasDistribute(req, res)
    default:
      console.warn('⚠️ Route not found:', route, 'Available routes: products, affiliates/track-click, payments/paypal, king-midas/distribute')
      return res.status(404).json({ error: `Shop route not found: ${route}`, availableRoutes: ['products', 'affiliates/track-click', 'payments/paypal', 'king-midas/distribute'] })
  }
}

async function handleProducts(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_products-handler.js')
  return handler.default(req, res)
}

async function handleAffiliatesTrackClick(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_affiliates-track-click-handler.js')
  return handler.default(req, res)
}

async function handlePaymentsPaypal(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('📦 Loading PayPal payments handler...')
    const handler = await import('../../lib/api-handlers/_payments-paypal-handler.js')
    console.log('✅ PayPal handler loaded, calling default export')
    return handler.default(req, res)
  } catch (error) {
    console.error('❌ Error loading PayPal handler:', error)
    return res.status(500).json({ error: 'Failed to load PayPal handler', details: error instanceof Error ? error.message : String(error) })
  }
}

async function handleKingMidasDistribute(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_king-midas-distribute-handler.js')
  return handler.default(req, res)
}
