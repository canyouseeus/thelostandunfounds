import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text
  // Use browser-like decoding for common entities
  return text
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
}

/**
 * Extract image URLs from image objects or strings
 */
function extractImageUrls(images: any): string[] {
  if (!images) return []
  if (Array.isArray(images)) {
    return images.map(img => {
      if (typeof img === 'string') return img
      if (img && typeof img === 'object' && img.url) return img.url
      return null
    }).filter(Boolean) as string[]
  }
  if (typeof images === 'string') return [images]
  return []
}

/**
 * Strip HTML tags from text and clean up whitespace
 */
function stripHtmlTags(text: string): string {
  if (!text) return text
  // Remove HTML tags and decode entities
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

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
    const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN
    // Step 2: Support query parameter for direct collection fetching
    const collectionHandle = req.query.collection as string | undefined
    console.log('Collection handle from query:', collectionHandle)
    
    if (!storefrontToken) {
      console.error('FOURTHWALL_STOREFRONT_TOKEN not configured')
      return res.status(200).json({
        products: [],
        error: 'FOURTHWALL_STOREFRONT_TOKEN not configured',
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers',
      })
    }

    // Log token presence (but not the actual token) for debugging
    console.log(`Fourthwall API: Token present: ${!!storefrontToken}, Length: ${storefrontToken.length}`)
    
    // Use the official Fourthwall Storefront API
    // Docs: https://docs.fourthwall.com/storefront-api/
    // Try multiple endpoint formats and authentication methods
    const baseUrl = 'https://storefront-api.fourthwall.com'
    let apiUrl: string
    if (collectionHandle && collectionHandle !== 'all') {
      apiUrl = `${baseUrl}/v1/collections/${collectionHandle}/products`
    } else {
      // Try fetching all products directly
      apiUrl = `${baseUrl}/v1/products`
    }
    console.log(`Fourthwall API: Fetching from ${apiUrl}`)
    
    // Try query parameter first (standard approach per docs)
    // Docs: https://docs.fourthwall.com/storefront/getting-started/
    let response = await fetch(`${apiUrl}?storefront_token=${storefrontToken}`, {
      headers: {
        'Accept': 'application/json',
      },
    })

    // Log the response for debugging
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Fourthwall API ${apiUrl} returned ${response.status}:`, errorText.substring(0, 500))
    }

    // If that fails, try Authorization header
    if (!response.ok && response.status === 404) {
      console.log('Trying Authorization header instead of query parameter...')
      response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${storefrontToken}`,
        },
      })
    }

    // If still fails, try X-Storefront-Token header
    if (!response.ok && response.status === 404) {
      console.log('Trying X-Storefront-Token header...')
      response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Storefront-Token': storefrontToken,
        },
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Fourthwall API error: ${response.status} ${response.statusText}`, errorText)
      console.error(`Attempted URL: ${apiUrl}`)
      
      let errorMessage = `Fourthwall API error: ${response.status} ${response.statusText}`
      if (response.status === 401) {
        errorMessage += '. The storefront token may be invalid, expired, or incorrectly formatted. Please verify your token at: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers'
      } else if (response.status === 404) {
        errorMessage += '. The endpoint may be incorrect or the storefront may not be properly configured.'
      }
      
      console.error(`Fourthwall API: Returning error response:`, errorMessage)
      return res.status(200).json({
        products: [],
        error: errorMessage,
        message: errorMessage,
        errorDetails: errorText.substring(0, 200),
      })
    }

    const data = await response.json()
    console.log(`Fourthwall API: Response status ${response.status}, data type:`, Array.isArray(data) ? 'array' : typeof data)
    if (!Array.isArray(data)) {
      console.log(`Fourthwall API: Response keys:`, Object.keys(data))
    }

    // Transform the data to match our interface
    // Fourthwall Storefront API returns products in a specific format
    // See: https://docs.fourthwall.com/storefront-api/
    // The API may return { results: [...] } (matching fw-setup), { offers: [...] }, or just an array directly
    const offers = data.results || (Array.isArray(data) ? data : (data.offers || data.data || []))
    console.log(`Fourthwall API: Found ${offers.length} offers/products`)
    
    const transformedProducts = offers.map((offer: any) => {
        // Get the first variant for pricing
        const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
        const price = variant?.unitPrice?.value || 0
        const currency = variant?.unitPrice?.currency || 'USD'
        const compareAtPrice = variant?.compareAtPrice?.value
        
        return {
          id: offer.id || offer.slug || '',
          title: decodeHtmlEntities(offer.name || offer.title || 'Untitled Product'),
          description: stripHtmlTags(decodeHtmlEntities(offer.description || '')),
          price: price,
          compareAtPrice: compareAtPrice,
          currency: currency,
          images: extractImageUrls(offer.images || offer.image),
          handle: offer.slug || offer.handle || offer.id || '',
          available: offer.available !== false,
          variants: offer.variants || [],
          url: `https://thelostandunfounds-shop.fourthwall.com/products/${offer.slug || offer.handle || offer.id}`,
        }
      })
    
    console.log(`Fourthwall API: Returning ${transformedProducts.length} products`)
    return res.status(200).json({
      products: transformedProducts,
    })
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
