import type { VercelRequest, VercelResponse } from '@vercel/node'

// Copy of lib/api-handlers/_fourthwall-products-handler.ts
// This avoids Vercel bundling issues with relative imports

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

function stripHtmlTags(text: string): string {
  if (!text) return text
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
        error: 'FOURTHWALL_STOREFRONT_TOKEN not configured',
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured.',
      })
    }

    const baseUrl = 'https://storefront-api.fourthwall.com'
    let apiUrl: string
    if (collectionHandle && collectionHandle !== 'all') {
      apiUrl = `${baseUrl}/v1/collections/${collectionHandle}/products`
    } else {
      apiUrl = `${baseUrl}/v1/products`
    }
    
    let response = await fetch(`${apiUrl}?storefront_token=${storefrontToken}`, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok && response.status === 404 && !collectionHandle) {
      const collectionsUrl = `${baseUrl}/v1/collections?storefront_token=${storefrontToken}`
      const collectionsResponse = await fetch(collectionsUrl, {
        headers: { 'Accept': 'application/json' },
      })
      
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        let collections: any[] = []
        
        if (Array.isArray(collectionsData)) {
          collections = collectionsData
        } else if (collectionsData.collections && Array.isArray(collectionsData.collections)) {
          collections = collectionsData.collections
        } else if (collectionsData.data && Array.isArray(collectionsData.data)) {
          collections = collectionsData.data
        }
        
        const shopFeedUrl = `${baseUrl}/v1/shop/feed?storefront_token=${storefrontToken}`
        const shopFeedResponse = await fetch(shopFeedUrl, {
          headers: { 'Accept': 'application/json' },
        })
        
        let allProductsFromFeed: any[] = []
        if (shopFeedResponse.ok) {
          const shopFeedData = await shopFeedResponse.json()
          allProductsFromFeed = Array.isArray(shopFeedData) 
            ? shopFeedData 
            : (shopFeedData.offers || shopFeedData.products || shopFeedData.data || [])
        }
        
        if (allProductsFromFeed.length > 0) {
          const transformedProducts = allProductsFromFeed.map((offer: any) => {
            const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
            const price = variant?.unitPrice?.value || 0
            const currency = variant?.unitPrice?.currency || 'USD'
            const compareAtPrice = variant?.compareAtPrice?.value
            
            return {
              id: offer.id || offer.slug || '',
              title: decodeHtmlEntities(offer.name || offer.title || 'Untitled Product'),
              description: decodeHtmlEntities(offer.description || ''),
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
          
          return res.status(200).json({ products: transformedProducts })
        }
        
        const allOffers: any[] = []
        for (const collection of collections) {
          if (collection.id) {
            try {
              const offersUrl = `${baseUrl}/v1/collections/${collection.id}/products?storefront_token=${storefrontToken}`
              const offersResponse = await fetch(offersUrl, {
                headers: { 'Accept': 'application/json' },
              })
              
              if (offersResponse.ok) {
                const offersData = await offersResponse.json()
                const offers = offersData.results || (Array.isArray(offersData) ? offersData : (offersData.offers || offersData.data || []))
                allOffers.push(...offers)
              }
            } catch (err) {
              console.warn(`Failed to fetch from collection ${collection.id}:`, err)
            }
          }
        }
        
        const productMap = new Map<string, any>()
        allOffers.forEach((offer: any) => {
          const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
          const price = variant?.unitPrice?.value || 0
          const currency = variant?.unitPrice?.currency || 'USD'
          const compareAtPrice = variant?.compareAtPrice?.value
          const productId = offer.id || offer.slug || ''
          
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
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
            })
          }
        })
        
        return res.status(200).json({ products: Array.from(productMap.values()) })
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(200).json({
        products: [],
        error: `Fourthwall API error: ${response.status}`,
        message: errorText.substring(0, 200),
      })
    }

    const data = await response.json()
    const offers = data.results || (Array.isArray(data) ? data : (data.offers || data.data || []))
    
    const transformedProducts = offers.map((offer: any) => {
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
    
    return res.status(200).json({ products: transformedProducts })
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    return res.status(500).json({
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
