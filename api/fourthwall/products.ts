import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * API endpoint to fetch products from Fourthwall
 * This proxies requests to avoid CORS issues
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
    const storeSlug = 'thelostandunfounds-shop'
    
    // Try multiple API endpoint formats that Fourthwall might use
    const apiEndpoints = [
      `https://${storeSlug}.fourthwall.com/api/products`,
      `https://${storeSlug}.fourthwall.com/api/storefront/products`,
      `https://${storeSlug}.fourthwall.com/products.json`,
      `https://${storeSlug}.fourthwall.com/api/v1/products`,
    ]
    
    let data: any = null
    let lastError: Error | null = null
    
    // Try each endpoint until one works
    for (const apiUrl of apiEndpoints) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
        })

        if (response.ok) {
          data = await response.json()
          break
        }
      } catch (err) {
        lastError = err as Error
        continue
      }
    }

    // If no endpoint worked, return helpful error message
    if (!data) {
      console.error('All Fourthwall API endpoints failed:', lastError)
      return res.status(200).json({
        products: [],
        message: 'Fourthwall API access may need configuration. Please check your Fourthwall developer settings and ensure API access is enabled.',
        storeUrl: `https://${storeSlug}.fourthwall.com`,
      })
    }
    
    // Transform the data to match our interface
    // Handle different response formats
    let products: any[] = []
    
    if (Array.isArray(data)) {
      products = data
    } else if (data.products && Array.isArray(data.products)) {
      products = data.products
    } else if (data.data && Array.isArray(data.data)) {
      products = data.data
    }
    
    return res.status(200).json({
      products: products.map((product: any) => ({
        id: product.id || product.handle || String(Math.random()),
        title: product.title || product.name || 'Untitled Product',
        description: product.description || product.body_html || '',
        price: product.price ? (typeof product.price === 'string' ? parseFloat(product.price) : product.price) / (product.price > 1000 ? 100 : 1) : 0,
        compareAtPrice: product.compare_at_price ? (typeof product.compare_at_price === 'string' ? parseFloat(product.compare_at_price) : product.compare_at_price) / (product.compare_at_price > 1000 ? 100 : 1) : undefined,
        currency: product.currency || 'USD',
        images: product.images ? (Array.isArray(product.images) ? product.images.map((img: any) => typeof img === 'string' ? img : (img.src || img.url)) : []) : (product.image ? [typeof product.image === 'string' ? product.image : product.image.src] : []),
        handle: product.handle || product.id || '',
        available: product.available !== false && product.inventory_quantity !== 0,
        variants: product.variants || [],
        url: product.url || `https://${storeSlug}.fourthwall.com/products/${product.handle || product.id}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
