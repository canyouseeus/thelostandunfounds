// Note: We use dynamic imports to isolate failures. If one handler fails to load, the others (and ping) still work.
// This prevents "Function Invocation Failed" due to a single broken dependency.
// It also ensures that a crash in one module doesn't take down the entire routing infrastructure.

import type { VercelRequest, VercelResponse } from '@vercel/node'

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

    // Route to appropriate handler using DYNAMIC IMPORTS
    // This allows us to catch import errors (like missing dependencies) per-route
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
      case 'fourthwall/products':
        console.log('👉 Routing to: productsHandler')
        try {
          const { default: productsHandler } = await import('../../lib/api-handlers/_products-handler')
          return await productsHandler(req, res)
        } catch (err: any) {
          console.error('❌ Failed to load or execute products handler:', err)
          // Return JSON error instead of crashing
          return res.status(500).json({
            error: 'Products handler failed',
            message: err.message,
            details: 'Failed to load products module. Check server logs.'
          })
        }

      case 'affiliates/track-click':
        console.log('👉 Routing to: affiliatesTrackClickHandler')
        try {
          // Verify request body for this specific route to warn about common client issues
          if (req.method === 'POST' && (!req.body || !req.body.affiliateCode)) {
            console.warn('⚠️ Missing affiliateCode in body', req.body)
          }

          const { default: affiliatesTrackClickHandler } = await import('../../lib/api-handlers/_affiliates-track-click-handler')
          return await affiliatesTrackClickHandler(req, res)
        } catch (err: any) {
          console.error('❌ Failed to load or execute affiliates handler:', err)
          return res.status(500).json({
            error: 'Affiliates handler failed',
            message: err.message
          })
        }

      case 'payments/paypal':
        console.log('👉 Routing to: paymentsPaypalHandler')
        try {
          const { default: paymentsPaypalHandler } = await import('../../lib/api-handlers/_payments-paypal-handler')
          return await paymentsPaypalHandler(req, res)
        } catch (err: any) {
          console.error('❌ Failed to load paypal handler:', err)
          return res.status(500).json({ error: 'PayPal handler failed', message: err.message })
        }

      case 'payments/paypal/capture':
        console.log('👉 Routing to: paymentsPaypalCaptureHandler')
        try {
          const { default: paymentsPaypalCaptureHandler } = await import('../../lib/api-handlers/_payments-paypal-capture-handler')
          return await paymentsPaypalCaptureHandler(req, res)
        } catch (err: any) {
          console.error('❌ Failed to load paypal capture handler:', err)
          return res.status(500).json({ error: 'PayPal capture handler failed', message: err.message })
        }

      case 'king-midas/distribute':
        console.log('👉 Routing to: kingMidasDistributeHandler')
        try {
          const { default: kingMidasDistributeHandler } = await import('../../lib/api-handlers/_king-midas-distribute-handler')
          return await kingMidasDistributeHandler(req, res)
        } catch (err: any) {
          console.error('❌ Failed to load king midas handler:', err)
          return res.status(500).json({ error: 'King Midas handler failed', message: err.message })
        }

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
