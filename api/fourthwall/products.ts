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

    // If /v1/products doesn't work, try fetching collections first
    if (!response.ok && response.status === 404 && !collectionHandle) {
      console.log('v1/products endpoint not found, trying to fetch collections first...')
      const collectionsUrl = `${baseUrl}/v1/collections?storefront_token=${storefrontToken}`
      const collectionsResponse = await fetch(collectionsUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      // Step 3: Improved error handling for collections API
      if (!collectionsResponse.ok) {
        const errorText = await collectionsResponse.text()
        console.error(`Collections API error: ${collectionsResponse.status} ${collectionsResponse.statusText}`)
        console.error(`Collections API error response (first 1000 chars):`, errorText.substring(0, 1000))
        return res.status(200).json({
          products: [],
          error: `Failed to fetch collections: ${collectionsResponse.status}`,
          message: `Collections API returned ${collectionsResponse.status}. Response: ${errorText.substring(0, 200)}`,
          errorDetails: errorText.substring(0, 500),
        })
      }
      
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json()
        
        // Step 1: Enhanced Collections API Response Parsing
        // Log the full response structure for debugging
        console.log('Collections API response type:', Array.isArray(collectionsData) ? 'array' : typeof collectionsData)
        console.log('Collections API response keys:', Array.isArray(collectionsData) ? `Array with ${collectionsData.length} items` : Object.keys(collectionsData))
        console.log('Collections API response (first 1000 chars):', JSON.stringify(collectionsData).substring(0, 1000))
        
        // Try multiple response format parsings
        let collections: any[] = []
        
        // Format 1: Array directly
        if (Array.isArray(collectionsData)) {
          collections = collectionsData
          console.log('Parsed collections as direct array')
        }
        // Format 2: Nested object with collections key
        else if (collectionsData.collections && Array.isArray(collectionsData.collections)) {
          collections = collectionsData.collections
          console.log('Parsed collections from collectionsData.collections')
        }
        // Format 3: Data wrapper
        else if (collectionsData.data && Array.isArray(collectionsData.data)) {
          collections = collectionsData.data
          console.log('Parsed collections from collectionsData.data')
        }
        // Format 4: Items wrapper
        else if (collectionsData.items && Array.isArray(collectionsData.items)) {
          collections = collectionsData.items
          console.log('Parsed collections from collectionsData.items')
        }
        // Format 5: Check for nested structure
        else if (collectionsData.results && Array.isArray(collectionsData.results)) {
          collections = collectionsData.results
          console.log('Parsed collections from collectionsData.results')
        }
        // Format 6: Check if it's a single collection object wrapped
        else if (collectionsData.id || collectionsData.handle || collectionsData.slug) {
          collections = [collectionsData]
          console.log('Parsed single collection object')
        }
        
        console.log(`Found ${collections.length} collections after parsing`)
        
        // Log collection structure details
        if (collections.length > 0) {
          console.log('First collection structure (full):', JSON.stringify(collections[0]))
          collections.forEach((collection, index) => {
            console.log(`Collection ${index + 1}:`, {
              id: collection.id,
              handle: collection.handle,
              slug: collection.slug,
              name: collection.name || collection.title,
              hasProducts: !!collection.products,
              productCount: collection.products?.length || collection.product_count || 'unknown',
              allKeys: Object.keys(collection)
            })
          })
        }
        
        console.log(`Processing ${collections.length} collections, fetching offers from each...`)
        
        // CRITICAL FIX: Try shop feed endpoint FIRST since /offers endpoints return 404
        // This endpoint returns all products, which we can then filter by collection
        console.log('Trying shop feed endpoint to fetch all products...')
        const shopFeedUrl = `${baseUrl}/v1/shop/feed?storefront_token=${storefrontToken}`
        const shopFeedResponse = await fetch(shopFeedUrl, {
          headers: { 'Accept': 'application/json' },
        })
        
        let allProductsFromFeed: any[] = []
        if (shopFeedResponse.ok) {
          const shopFeedData = await shopFeedResponse.json()
          console.log('Shop feed response type:', Array.isArray(shopFeedData) ? 'array' : typeof shopFeedData)
          console.log('Shop feed response keys:', Array.isArray(shopFeedData) ? `Array with ${shopFeedData.length} items` : Object.keys(shopFeedData))
          console.log('Shop feed response (first 1000 chars):', JSON.stringify(shopFeedData).substring(0, 1000))
          
          allProductsFromFeed = Array.isArray(shopFeedData) 
            ? shopFeedData 
            : (shopFeedData.offers || shopFeedData.products || shopFeedData.data || shopFeedData.items || [])
          
          console.log(`✓ Shop feed returned ${allProductsFromFeed.length} products`)
        } else {
          const errorText = await shopFeedResponse.text().catch(() => '')
          console.log(`Shop feed endpoint returned ${shopFeedResponse.status}: ${errorText.substring(0, 200)}`)
        }
        
        // Step 2: Add Direct Collection Fetching
        // If no collections but response was OK, try fetching all products directly
        if (collections.length === 0) {
          console.log('No collections found in response, trying alternative approaches...')
          
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
            
            console.log(`Fourthwall API: Returning ${transformedProducts.length} products from shop feed`)
            return res.status(200).json({
              products: transformedProducts,
            })
          }
          
          // Try common collection handle formats as fallback
          const commonHandles = [
            'classic',
            'the-lost-unfounds-classic-collection',
            'the-lost-unfounds-classic',
            'lost-unfounds-classic',
            'classic-collection'
          ]
          
          console.log('Trying common collection handles:', commonHandles)
          for (const handle of commonHandles) {
            try {
              const testUrl = `${baseUrl}/v1/collections/${handle}/products?storefront_token=${storefrontToken}`
              console.log(`Trying collection handle: ${handle}`)
              const testResponse = await fetch(testUrl, {
                headers: { 'Accept': 'application/json' },
              })
              
              if (testResponse.ok) {
                const testData = await testResponse.json()
                const testOffers = testData.results || (Array.isArray(testData) ? testData : (testData.offers || []))
                if (testOffers.length > 0) {
                  console.log(`Found ${testOffers.length} products using handle: ${handle}`)
                  const transformedProducts = testOffers.map((offer: any) => {
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
                  
                  return res.status(200).json({
                    products: transformedProducts,
                    collectionHandle: handle,
                  })
                }
              } else {
                console.log(`Handle ${handle} returned ${testResponse.status}`)
              }
            } catch (err) {
              console.warn(`Failed to test handle ${handle}:`, err)
            }
          }
        }
        
        // Step 3 & 4: Fetch offers from all collections with improved handle detection
        const allOffers: any[] = []
        const collectionMetadata: Array<{name: string, handle: string, status: string, productCount: number}> = []
        
        for (const collection of collections) {
          // Step 4: Extract collection handle from various possible fields
          let collectionHandle: string | null = null
          
          // Log all available fields for debugging
          console.log(`Collection "${collection.name || collection.title}" available fields:`, Object.keys(collection))
          console.log(`Collection "${collection.name || collection.title}" full object:`, JSON.stringify(collection))
          
          // Step 3: Try multiple handle formats based on common Fourthwall patterns
          // Step 1: Add 'classic' as primary handle (highest priority)
          const possibleHandles = [
            // Known handle for this collection - try first!
            'classic',
            // Extract handle from URL if available
            collection.url ? (() => {
              try {
                const url = new URL(collection.url)
                const handle = url.pathname.split('/collections/')[1]?.split('/')[0]
                return handle || null
              } catch {
                return null
              }
            })() : null,
            collection.permalink ? (() => {
              try {
                const handle = collection.permalink.split('/collections/')[1]?.split('/')[0]
                return handle || null
              } catch {
                return null
              }
            })() : null,
            // Step 3: Detect "classic" in collection name
            collection.name?.toLowerCase().match(/classic/i) ? 'classic' : null,
            collection.title?.toLowerCase().match(/classic/i) ? 'classic' : null,
            // Standard fields
            collection.handle,
            collection.slug,
            collection.url_slug,
            collection.collection_handle,
            collection.collection_slug,
            // ID formats
            collection.id,
            collection.collection_id,
            // Try ID without prefix if it starts with col_
            collection.id?.startsWith('col_') ? collection.id.replace('col_', '') : null,
            // Try ID with different encoding
            collection.id ? encodeURIComponent(collection.id) : null,
            // Convert name/title to handle format (multiple variations)
            collection.name?.toLowerCase()
              .replace(/&#43;/g, '-plus-')
              .replace(/&#34;/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, ''),
            collection.name?.toLowerCase()
              .replace(/&#43;/g, '')
              .replace(/&#34;/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, ''),
            collection.title?.toLowerCase()
              .replace(/&#43;/g, '-plus-')
              .replace(/&#34;/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, ''),
            collection.title?.toLowerCase()
              .replace(/&#43;/g, '')
              .replace(/&#34;/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, ''),
          ].filter(Boolean) as string[]
          
          // Remove duplicates
          const uniqueHandles = [...new Set(possibleHandles)]
          
          console.log(`Trying handles for "${collection.name || collection.title}":`, uniqueHandles)
          
          // Step 4: Try alternative endpoint formats if standard doesn't work
          // First, try standard collection endpoint
          let foundProducts = false
          
          // CRITICAL FIX: Try collection ID first using /products endpoint (matching fw-setup)
          if (collection.id) {
            try {
              const offersUrlById = `${baseUrl}/v1/collections/${collection.id}/products?storefront_token=${storefrontToken}`
              console.log(`Trying to fetch from collection ID: ${collection.id}`)
              const offersResponseById = await fetch(offersUrlById, {
                headers: { 'Accept': 'application/json' },
              })
              
              if (offersResponseById.ok) {
                const offersData = await offersResponseById.json()
                const offers = offersData.results || (Array.isArray(offersData) ? offersData : (offersData.offers || offersData.data || []))
                
                if (offers.length > 0) {
                  collectionHandle = collection.id
                  allOffers.push(...offers)
                  foundProducts = true
                  
                  const collectionName = collection.name || collection.title || 'Unknown'
                  const collectionStatus = collection.status || collection.visibility || 'unknown'
                  collectionMetadata.push({
                    name: collectionName,
                    handle: collection.slug || collection.id,
                    status: collectionStatus,
                    productCount: offers.length
                  })
                  
                  console.log(`✓ Collection "${collectionName}" (ID: ${collection.id}): Found ${offers.length} products`)
                  // Success with ID, skip trying handles
                } else {
                  console.log(`Collection ID ${collection.id} returned 0 products`)
                }
              } else {
                const errorText = await offersResponseById.text().catch(() => '')
                console.log(`Collection ID ${collection.id} returned ${offersResponseById.status}: ${errorText.substring(0, 200)}`)
              }
            } catch (err) {
              console.warn(`Failed to fetch from collection ID ${collection.id}:`, err)
            }
          }
          
          // Fallback: Try each possible handle format if ID didn't work
          if (!foundProducts) {
            for (const handle of uniqueHandles) {
              if (handle) {
                try {
                  const offersUrl = `${baseUrl}/v1/collections/${handle}/products?storefront_token=${storefrontToken}`
                  console.log(`Trying to fetch from collection handle: ${handle}`)
                  const offersResponse = await fetch(offersUrl, {
                    headers: { 'Accept': 'application/json' },
                  })
                  
                  if (offersResponse.ok) {
                    const offersData = await offersResponse.json()
                    const offers = offersData.results || (Array.isArray(offersData) ? offersData : (offersData.offers || offersData.data || []))
                    
                    if (offers.length > 0) {
                      collectionHandle = handle
                      allOffers.push(...offers)
                      foundProducts = true
                      
                      // Step 3: Log collection metadata
                      const collectionName = collection.name || collection.title || 'Unknown'
                      const collectionStatus = collection.status || collection.visibility || 'unknown'
                      collectionMetadata.push({
                        name: collectionName,
                        handle: handle,
                        status: collectionStatus,
                        productCount: offers.length
                      })
                      
                      console.log(`✓ Collection "${collectionName}" (handle: ${handle}): Found ${offers.length} products`)
                      break // Success, move to next collection
                    } else {
                      console.log(`Collection handle ${handle} returned 0 products`)
                    }
                  } else {
                    const errorText = await offersResponse.text().catch(() => '')
                    console.log(`Collection handle ${handle} returned ${offersResponse.status}: ${errorText.substring(0, 200)}`)
                  }
                } catch (err) {
                  console.warn(`Failed to fetch from collection handle ${handle}:`, err)
                }
              }
            }
          }
          
          // Step 4: Fallback - Filter products from shop feed by collection ID/slug
          if (!foundProducts && collection.id && allProductsFromFeed.length > 0) {
            console.log(`Trying fallback: Filter shop feed products by collection ID ${collection.id} or slug ${collection.slug}`)
            try {
              // Filter products by collection ID or slug
              const filteredOffers = allProductsFromFeed.filter((offer: any) => {
                // Check various collection fields
                const offerCollectionId = offer.collection_id || offer.collection?.id || offer.collections?.[0]?.id
                const offerCollectionSlug = offer.collection_slug || offer.collection?.slug || offer.collections?.[0]?.slug
                const offerCollectionHandle = offer.collection_handle || offer.collection?.handle || offer.collections?.[0]?.handle
                
                return offerCollectionId === collection.id ||
                       offerCollectionId === collection.id.replace('col_', '') ||
                       offerCollectionSlug === collection.slug ||
                       offerCollectionHandle === collection.slug ||
                       offerCollectionHandle === collection.handle ||
                       // Check if collections array contains this collection
                       (Array.isArray(offer.collections) && offer.collections.some((c: any) => 
                         c.id === collection.id || 
                         c.slug === collection.slug ||
                         c.handle === collection.slug
                       ))
              })
              
              if (filteredOffers.length > 0) {
                console.log(`✓ Found ${filteredOffers.length} products via shop feed filtering`)
                allOffers.push(...filteredOffers)
                foundProducts = true
                collectionHandle = collection.slug || collection.id
                
                const collectionName = collection.name || collection.title || 'Unknown'
                collectionMetadata.push({
                  name: collectionName,
                  handle: collection.slug || collection.id,
                  status: collection.status || 'unknown',
                  productCount: filteredOffers.length
                })
              } else {
                console.log(`No products found in shop feed matching collection ${collection.id} (${collection.slug})`)
              }
            } catch (err) {
              console.warn(`Fallback filtering method failed:`, err)
            }
          }
          
          // If still no products and shop feed has products, log for debugging
          if (!foundProducts && allProductsFromFeed.length > 0) {
            console.log(`Collection "${collection.name || collection.title}" has no matching products in shop feed`)
            console.log(`Sample product structure:`, JSON.stringify(allProductsFromFeed[0]).substring(0, 500))
          }
          
          // Step 3: Log if no handle worked
          if (!foundProducts) {
            const collectionName = collection.name || collection.title || 'Unknown'
            console.warn(`⚠ Could not fetch products from collection "${collectionName}". Tried handles:`, uniqueHandles)
            collectionMetadata.push({
              name: collectionName,
              handle: uniqueHandles[0] || 'unknown',
              status: collection.status || 'unknown',
              productCount: 0
            })
          }
        }
        
        // Step 3: Log summary
        console.log('Collection fetch summary:', {
          totalCollections: collections.length,
          successfulCollections: collectionMetadata.filter(c => c.productCount > 0).length,
          totalProducts: allOffers.length,
          collections: collectionMetadata
        })
        
        // Return combined offers with deduplication and proper formatting
        const productMap = new Map<string, any>()
        
        allOffers.forEach((offer: any) => {
          const variant = offer.variants && offer.variants.length > 0 ? offer.variants[0] : null
          const price = variant?.unitPrice?.value || 0
          const currency = variant?.unitPrice?.currency || 'USD'
          const compareAtPrice = variant?.compareAtPrice?.value
          const productId = offer.id || offer.slug || ''
          
          // Deduplicate by ID - keep first occurrence
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
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
            })
          }
        })
        
        const transformedProducts = Array.from(productMap.values())
        
        console.log(`Fourthwall API: Returning ${transformedProducts.length} unique products from collections (${allOffers.length} total before deduplication)`)
        return res.status(200).json({
          products: transformedProducts,
          collections: collectionMetadata,
          totalCollections: collections.length,
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

