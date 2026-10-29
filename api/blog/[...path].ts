import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
import { verifiedUser } from '../../lib/api-handlers/_turnstile.js'

// Every route here sends an email to the address in the request body, and none
// of them used to check who was asking, so anyone could make us mail anyone.
// Now: the submission confirmation goes only to the signed-in author's own
// verified address; the review emails (published, approved, rejected,
// unpublished) are admin actions. TURNSTILE RULE, CLAUDE.md.
const ADMIN_ROUTES = new Set([
  'post-published', 'notify',
  'submission-approved', 'approved',
  'submission-rejected', 'rejected',
  'submission-unpublished', 'unpublished',
])

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

  console.log('Blog router - query.path:', req.query.path, 'route:', route, 'method:', req.method, 'url:', req.url)

  // Route to appropriate handler
  try {
    if (ADMIN_ROUTES.has(route) && !(await verifyAdmin(req))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (route === 'submission-confirmation' || route === 'submitted') {
      const user = await verifiedUser(req)
      if (!user?.email) return res.status(401).json({ error: 'Sign in to submit an article.' })
      // The account's verified address, never one typed into the request.
      req.body = { ...(req.body || {}), authorEmail: user.email }
    }

    switch (route) {
      case 'post-published':
      case 'notify':
        return await handlePostPublishedNotify(req, res)
      case 'submission-confirmation':
      case 'submitted':
        return await handleSubmissionConfirmation(req, res)
      case 'submission-approved':
      case 'approved':
        return await handleSubmissionApproved(req, res)
      case 'submission-rejected':
      case 'rejected':
        return await handleSubmissionRejected(req, res)
      case 'submission-unpublished':
      case 'unpublished':
        return await handleSubmissionUnpublished(req, res)
      default:
        return res.status(404).json({ error: `Blog route not found: ${route}` })
    }
  } catch (error: any) {
    console.error('Blog router error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

/**
 * Blog Post Published Notification Handler
 */
async function handlePostPublishedNotify(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_blog-post-published-notify-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Confirmation Handler
 */
async function handleSubmissionConfirmation(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_blog-submission-confirmation-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Approved Handler
 */
async function handleSubmissionApproved(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_blog-submission-approved-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Rejected Handler
 */
async function handleSubmissionRejected(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_blog-submission-rejected-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Unpublished Handler
 */
async function handleSubmissionUnpublished(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../../lib/api-handlers/_blog-post-unpublished-notify-handler.js')
  return await handler.default(req, res)
}
