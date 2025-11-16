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
    const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN
    const collectionHandle = req.query.collection as string | undefined
    
    if (!storefrontToken) {
      return res.status(200).json({
        products: [],
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers',
      })
    }
    
    // Use the official Fourthwall Storefront API
    // Docs: https://docs.fourthwall.com/storefront-api/
    // Try multiple endpoint formats and authentication methods
    const baseUrl = 'https://storefront-api.fourthwall.com'
    let apiUrl: string
    if (collectionHandle && collectionHandle !== 'all') {
      apiUrl = `${baseUrl}/v1/collections/${collectionHandle}/offers`
    } else {
      apiUrl = `${baseUrl}/v1/offers`
    }
    
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
      const errorText = await response.text()
      console.error(`Fourthwall API error: ${response.status} ${response.statusText}`, errorText)
      console.error(`Attempted URL: ${apiUrl}`)
      return res.status(200).json({
        products: [],
        message: `Fourthwall API error: ${response.status} ${response.statusText}. Check your storefront token.`,
        error: errorText.substring(0, 200), // Include first 200 chars of error for debugging
      })
    }

    const data = await response.json()

    // Transform the data to match our interface
    // Fourthwall Storefront API returns offers (products) in a specific format
    // See: https://docs.fourthwall.com/storefront-api/
    // The API may return { offers: [...] } or just an array directly
    const offers = Array.isArray(data) ? data : (data.offers || data.data || [])
    
    return res.status(200).json({
      products: offers.map((offer: any) => {
        // Get the first variant for pricing
        const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
        const price = variant?.unitPrice?.value || 0
        const currency = variant?.unitPrice?.currency || 'USD'
        const compareAtPrice = variant?.compareAtPrice?.value
        
        return {
          id: offer.id || offer.slug || '',
          title: offer.name || offer.title || 'Untitled Product',
          description: offer.description || '',
          price: price,
          compareAtPrice: compareAtPrice,
          currency: currency,
          images: offer.images || (offer.image ? [offer.image] : []),
          handle: offer.slug || offer.handle || offer.id || '',
          available: offer.available !== false,
          variants: offer.variants || [],
          url: `https://thelostandunfounds-shop.fourthwall.com/products/${offer.slug || offer.handle || offer.id}`,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

