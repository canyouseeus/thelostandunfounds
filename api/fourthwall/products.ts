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
      apiUrl = `${baseUrl}/v1/collections/${collectionHandle}/offers`
    } else {
      // Try fetching all offers directly
      apiUrl = `${baseUrl}/v1/offers`
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

    // If /v1/offers doesn't work, try fetching collections first
    if (!response.ok && response.status === 404 && !collectionHandle) {
      console.log('v1/offers endpoint not found, trying to fetch collections first...')
      const collectionsUrl = `${baseUrl}/v1/collections?storefront_token=${storefrontToken}`
      const collectionsResponse = await fetch(collectionsUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        console.log('Collections API response:', JSON.stringify(collectionsData).substring(0, 500))
        const collections = Array.isArray(collectionsData) ? collectionsData : (collectionsData.collections || collectionsData.data || [])
        console.log(`Found ${collections.length} collections, fetching offers from each...`)
        
        // If no collections but response was OK, try fetching all products directly
        if (collections.length === 0) {
          console.log('No collections found, trying alternative endpoints...')
          // Try shop feed endpoint
          const shopFeedUrl = `${baseUrl}/v1/shop/feed?storefront_token=${storefrontToken}`
          const shopFeedResponse = await fetch(shopFeedUrl, {
            headers: { 'Accept': 'application/json' },
          })
          
          if (shopFeedResponse.ok) {
            const shopFeedData = await shopFeedResponse.json()
            console.log('Shop feed response:', JSON.stringify(shopFeedData).substring(0, 500))
            const feedOffers = Array.isArray(shopFeedData) ? shopFeedData : (shopFeedData.offers || shopFeedData.products || shopFeedData.data || [])
            
            if (feedOffers.length > 0) {
              const transformedProducts = feedOffers.map((offer: any) => {
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
              })
              
              console.log(`Fourthwall API: Returning ${transformedProducts.length} products from shop feed`)
              return res.status(200).json({
                products: transformedProducts,
              })
            }
          }
        }
        
        // Fetch offers from all collections
        const allOffers: any[] = []
        for (const collection of collections) {
          const collectionHandle = collection.handle || collection.slug || collection.id
          if (collectionHandle) {
            try {
              const offersUrl = `${baseUrl}/v1/collections/${collectionHandle}/offers?storefront_token=${storefrontToken}`
              const offersResponse = await fetch(offersUrl, {
                headers: { 'Accept': 'application/json' },
              })
              if (offersResponse.ok) {
                const offersData = await offersResponse.json()
                const offers = Array.isArray(offersData) ? offersData : (offersData.offers || [])
                allOffers.push(...offers)
                console.log(`Collection ${collectionHandle}: ${offers.length} offers`)
              }
            } catch (err) {
              console.warn(`Failed to fetch offers from collection ${collectionHandle}:`, err)
            }
          }
        }
        
        // Return combined offers
        const transformedProducts = allOffers.map((offer: any) => {
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
        })
        
        console.log(`Fourthwall API: Returning ${transformedProducts.length} products from collections`)
        return res.status(200).json({
          products: transformedProducts,
        })
      }
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
        errorDetails: errorText.substring(0, 200), // Include first 200 chars of error for debugging
      })
    }

    const data = await response.json()
    console.log(`Fourthwall API: Response status ${response.status}, data type:`, Array.isArray(data) ? 'array' : typeof data)
    if (!Array.isArray(data)) {
      console.log(`Fourthwall API: Response keys:`, Object.keys(data))
    }

    // Transform the data to match our interface
    // Fourthwall Storefront API returns offers (products) in a specific format
    // See: https://docs.fourthwall.com/storefront-api/
    // The API may return { offers: [...] } or just an array directly
    const offers = Array.isArray(data) ? data : (data.offers || data.data || [])
    console.log(`Fourthwall API: Found ${offers.length} offers/products`)
    
    const transformedProducts = offers.map((offer: any) => {
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

