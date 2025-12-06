import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFourthwallProducts } from '../fourthwall/handler'

/**
 * Products Handler
 * Fetches products from Fourthwall and returns them in the format expected by the Shop page
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Call the Fourthwall handler which returns { products: [...] }
    return handleFourthwallProducts(req, res)
  } catch (error: any) {
    console.error('❌ Products handler failed:', error)
    const fallbackProducts = [
      {
        id: 'fallback-tee',
        title: 'Store temporarily unavailable',
        description: 'Fourthwall API is unavailable right now. Please try again shortly.',
        price: 0,
        compareAtPrice: 0,
        currency: 'USD',
        images: ['/logo.png'],
        handle: 'store-unavailable',
        available: true,
        url: 'https://www.thelostandunfounds.com',
        category: 'notice',
        featured: true,
      },
    ]
    // Fail soft so the shop page can still render
    return res.status(200).json({
      products: fallbackProducts,
      error: 'Failed to load products',
      message: error?.message || 'Unknown error',
    })
  }
}
