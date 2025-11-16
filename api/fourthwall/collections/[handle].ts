import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text
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
    const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN
    
    if (!handle || typeof handle !== 'string') {
      return res.status(400).json({ error: 'Collection handle is required' })
    }

    if (!storefrontToken) {
      return res.status(200).json({
        products: [],
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers',
      })
    }

    // Use the official Fourthwall Storefront API
    // Docs: https://docs.fourthwall.com/storefront-api/
    // Use /products endpoint (matching fw-setup implementation)
    const apiUrl = `https://storefront-api.fourthwall.com/v1/collections/${handle}/products`
    
    // Try query parameter first (standard approach)
    let response = await fetch(`${apiUrl}?storefront_token=${storefrontToken}`, {
      headers: {
        'Accept': 'application/json',
      },
    })

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
      console.error(`Fourthwall API error: ${response.status} ${response.statusText}`)
      console.error(`Attempted URL: ${apiUrl}`)
      return res.status(200).json({
        products: [],
        message: `Collection not found or API error: ${response.status} ${response.statusText}`,
      })
    }

    const data = await response.json()
    // Handle {results: [...]} format (matching fw-setup) or fallback to other formats
    const offers = data.results || data.offers || (Array.isArray(data) ? data : [])
    
    return res.status(200).json({
      products: offers.map((offer: any) => {
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
      }),
    })
  } catch (error) {
    console.error('Error fetching Fourthwall collection:', error)
    return res.status(500).json({
      error: 'Failed to fetch collection',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

