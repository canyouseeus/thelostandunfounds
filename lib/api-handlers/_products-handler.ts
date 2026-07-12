import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleFourthwallProducts } from '../fourthwall/handler.js'
import { getProdigiShopProducts } from './_prodigi-products-handler.js'

/**
 * Products Handler
 * Fetches products from Fourthwall plus our native Prodigi print-on-demand
 * catalog, and returns them merged in the format expected by the Shop page.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Capture the Fourthwall handler's JSON response so we can merge in
    // Prodigi products before sending it, without changing its own
    // signature (it writes directly to `res`).
    const captured: { statusCode?: number; body?: any } = {}
    const fakeRes: any = {
      setHeader: (...args: any[]) => (res as any).setHeader(...args),
      status: (code: number) => {
        captured.statusCode = code
        return fakeRes
      },
      json: (body: any) => {
        captured.body = body
        return fakeRes
      },
      end: () => fakeRes,
    }

    await handleFourthwallProducts(req, fakeRes)

    const prodigiProducts = await getProdigiShopProducts()
    const baseProducts = Array.isArray(captured.body?.products) ? captured.body.products : []

    return res.status(captured.statusCode || 200).json({
      ...captured.body,
      products: [...prodigiProducts, ...baseProducts],
    })
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
