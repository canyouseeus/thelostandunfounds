import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * API endpoint to fetch products from a specific Fourthwall collection
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { handle } = req.query
    const storeSlug = process.env.FOURTHWALL_STORE_SLUG || 'thelostandunfounds-shop'
    const apiKey = process.env.FOURTHWALL_API_KEY
    
    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Collection handle is required' })
    }

    // Build headers with API key if available
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['X-API-Key'] = apiKey
    }

    // Fourthwall API endpoint for collections
    const apiUrl = `https://${storeSlug}.fourthwall.com/api/collections/${handle}/products`
    
    const response = await fetch(apiUrl, {
      headers,
    })

    if (!response.ok) {
      console.error(`Fourthwall API error: ${response.status} ${response.statusText}`)
      return res.status(200).json({
        products: [],
        message: 'Collection not found or API access needed.',
      })
    }

    const data = await response.json()
    const products = Array.isArray(data) ? data : (data.products || [])
    
    return res.status(200).json({
      products: products.map((product: any) => ({
        id: product.id || product.handle,
        title: product.title || product.name,
        description: product.description,
        price: product.price ? parseFloat(product.price) / 100 : 0,
        compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) / 100 : undefined,
        currency: product.currency || 'USD',
        images: product.images || (product.image ? [product.image] : []),
        handle: product.handle || product.id,
        available: product.available !== false,
        variants: product.variants || [],
        url: product.url || `https://${storeSlug}.fourthwall.com/products/${product.handle || product.id}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching Fourthwall collection:', error)
    return res.status(500).json({
      error: 'Failed to fetch collection',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
