import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract route from path parameter (Vercel catch-all)
  let route = ''
  if (req.query.path) {
    route = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path
  } else {
    // Fallback: extract from URL
    const urlPath = req.url?.split('?')[0] || ''
    const pathParts = urlPath.split('/').filter(p => p)
    route = pathParts[pathParts.length - 1] || ''
  }

  // Route to appropriate handler
  switch (route) {
    case 'product-costs':
      return handleProductCosts(req, res)
    case 'reset-password':
      return handleResetPassword(req, res)
    case 'send-existing-publication-emails':
      return handleSendExistingPublicationEmails(req, res)
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

/**
 * Send Existing Publication Emails Handler
 */
async function handleSendExistingPublicationEmails(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_send-existing-publication-emails-handler.js')
  return await handler.default(req, res)
}
