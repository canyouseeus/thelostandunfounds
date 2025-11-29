import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { path } = req.query
  const route = Array.isArray(path) ? path[0] : path

  // Route to appropriate handler
  switch (route) {
    case 'product-costs':
      return handleProductCosts(req, res)
    case 'reset-password':
      return handleResetPassword(req, res)
    default:
      return res.status(404).json({ error: `Admin route not found: ${route}` })
  }
}

/**
 * Product Cost Management Handler
 */
async function handleProductCosts(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_product-costs-handler')
  return handler.default(req, res)
}

/**
 * Reset Password Handler
 */
async function handleResetPassword(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_reset-password-handler')
  return handler.default(req, res)
}
