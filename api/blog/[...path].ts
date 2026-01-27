import type { VercelRequest, VercelResponse } from '@vercel/node'

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
  const handler = await import('../lib/api-handlers/_blog-post-published-notify-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Confirmation Handler
 */
async function handleSubmissionConfirmation(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../lib/api-handlers/_blog-submission-confirmation-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Approved Handler
 */
async function handleSubmissionApproved(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../lib/api-handlers/_blog-submission-approved-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Rejected Handler
 */
async function handleSubmissionRejected(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../lib/api-handlers/_blog-submission-rejected-handler.js')
  return await handler.default(req, res)
}

/**
 * Submission Unpublished Handler
 */
async function handleSubmissionUnpublished(req: VercelRequest, res: VercelResponse) {
  const handler = await import('../lib/api-handlers/_blog-post-unpublished-notify-handler.js')
  return await handler.default(req, res)
}
