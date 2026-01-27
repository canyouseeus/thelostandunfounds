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
  const startTime = Date.now()

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cron-Secret, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Extract route from path parameter (Vercel catch-all)
  // For /api/shop/fourthwall/products, req.query.path should be ['fourthwall', 'products']
  let route = ''
  let routingMethod = 'unknown'

  try {
    // First try query.path (Vercel catch-all parameter)
    if (req.query.path) {
      if (Array.isArray(req.query.path)) {
        route = req.query.path.join('/')
      } else {
        route = req.query.path
      }
      routingMethod = 'vercel-query-path'
    }

    // Fallback: extract from URL
    if (!route && req.url) {
      const urlPath = req.url.split('?')[0]
      const pathParts = urlPath.split('/').filter(p => p)
      // Find 'shop' index and get everything after it
      const shopIndex = pathParts.indexOf('shop')
      if (shopIndex >= 0 && shopIndex < pathParts.length - 1) {
        route = pathParts.slice(shopIndex + 1).join('/')
        routingMethod = 'manual-url-parse'
      }
    }

    // Logging context
    const logContext = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      query: JSON.stringify(req.query),
      route: route,
      routingMethod,
      headers: Object.keys(req.headers),
    }

    console.log('🛒 Shop Router Request:', JSON.stringify(logContext))

    if (!route) {
      console.log('⚠️ No route determined')
      return res.status(404).json({
        error: 'Shop route not specified',
        debug: logContext
      })
    }

    // Route to appropriate handler
    switch (route) {
      case 'ping':
      case 'health':
        return res.status(200).json({
          status: 'ok',
          message: 'Shop API is healthy',
          timestamp: new Date().toISOString(),
          env: process.env.VERCEL_ENV || 'development'
        })

      case 'products':
        console.log('👉 Routing to: productsHandler')
        return await productsHandler(req, res)

      case 'fourthwall/products':
        // Deprecated: Keep for backward compatibility
        console.log('👉 Routing to: productsHandler (fourthwall fallback)')
        return await productsHandler(req, res)

      case 'affiliates/track-click':
        console.log('👉 Routing to: affiliatesTrackClickHandler')
        return await affiliatesTrackClickHandler(req, res)

      case 'payments/paypal':
        console.log('👉 Routing to: paymentsPaypalHandler')
        return await paymentsPaypalHandler(req, res)

      case 'payments/paypal/capture':
        console.log('👉 Routing to: paymentsPaypalCaptureHandler')
        return await paymentsPaypalCaptureHandler(req, res)

      case 'king-midas/distribute':
        console.log('👉 Routing to: kingMidasDistributeHandler')
        return await kingMidasDistributeHandler(req, res)

      default:
        console.warn('⚠️ Route not matched:', route)
        return res.status(404).json({
          error: `Shop route not found: ${route}`,
          availableRoutes: [
            'products',
            'affiliates/track-click',
            'payments/paypal',
            'payments/paypal/capture',
            'king-midas/distribute',
            'ping'
          ]
        })
    }
  } catch (error: any) {
    console.error('🔥 CRITICAL: Shop router execution failed:', error)
    console.error('Stack trace:', error.stack)

    // Attempt to return JSON error if response hasn't been sent
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'The shop API encountered a critical error.',
        details: error.message, // Safe to expose generally, but might want to hide in prod if sensitive
        route: route
      })
    }
  } finally {
    const duration = Date.now() - startTime
    console.log(`⏱️ Request processing time: ${duration}ms`)
  }
}
