import type { VercelRequest, VercelResponse } from '@vercel/node'

// Configure to receive raw body for signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
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
