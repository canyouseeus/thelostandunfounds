import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Get raw body for signature verification
    // In Vercel, we need to read from the request stream
    let rawBody = ''
    if (req.body) {
      if (typeof req.body === 'string') {
        rawBody = req.body
      } else if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf-8')
      } else {
        // Body was parsed as JSON, reconstruct it
        rawBody = JSON.stringify(req.body)
      }
    }

    // Pass raw body to handler via request object
    ;(req as any).rawBody = rawBody

    const handler = await import('../../lib/api-handlers/_discord-interactions-handler.js')
    return handler.default(req, res)
  } catch (error: any) {
    console.error('Discord interactions handler error:', error)
    return res.status(500).json({
      error: 'Handler failed to load',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
