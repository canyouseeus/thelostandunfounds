import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // From api/shop/fourthwall/products.ts, go up 3 levels to root, then into lib/api-handlers
    const handlerModule = await import('../../../lib/api-handlers/_fourthwall-products-handler')
    return await handlerModule.default(req, res)
  } catch (error: any) {
    console.error('Error importing fourthwall products handler:', error)
    return res.status(500).json({ 
      error: 'Failed to load products handler',
      details: error.message 
    })
  }
}
