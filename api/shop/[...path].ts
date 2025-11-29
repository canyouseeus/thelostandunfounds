import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query
  const pathArray = Array.isArray(path) ? path : path ? [path] : []
  const route = pathArray.join('/')

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
