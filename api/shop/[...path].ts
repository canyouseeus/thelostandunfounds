import type { VercelRequest, VercelResponse } from '@vercel/node'
import productsHandler from '../../lib/api-handlers/_products-handler'
import affiliatesTrackClickHandler from '../../lib/api-handlers/_affiliates-track-click-handler'
import paymentsPaypalHandler from '../../lib/api-handlers/_payments-paypal-handler'
import paymentsPaypalCaptureHandler from '../../lib/api-handlers/_payments-paypal-capture-handler'
import kingMidasDistributeHandler from '../../lib/api-handlers/_king-midas-distribute-handler'

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

  try {
    // Route to appropriate handler
    switch (route) {
      case 'products':
        console.log('✅ Routing to products handler')
        return productsHandler(req, res)
      case 'fourthwall/products':
        // Deprecated: Keep for backward compatibility but redirect to native products
        console.log('✅ Routing to products handler (fourthwall fallback)')
        return productsHandler(req, res)
      case 'affiliates/track-click':
        console.log('✅ Routing to affiliates/track-click handler')
        return affiliatesTrackClickHandler(req, res)
      case 'payments/paypal':
        console.log('✅ Routing to payments/paypal handler')
        return paymentsPaypalHandler(req, res)
      case 'payments/paypal/capture':
        console.log('✅ Routing to payments/paypal/capture handler')
        return paymentsPaypalCaptureHandler(req, res)
      case 'king-midas/distribute':
        console.log('✅ Routing to king-midas/distribute handler')
        return kingMidasDistributeHandler(req, res)
      default:
        console.warn('⚠️ Route not found:', route)
        return res.status(404).json({ error: `Shop route not found: ${route}` })
    }
  } catch (error: any) {
    console.error('🔥 Shop router trapped error:', error)
    return res.status(500).json({ error: 'Internal Server Error', details: error.message })
  }
}
