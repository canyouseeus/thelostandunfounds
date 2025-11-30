/**
 * Main Fourthwall API Handler
 * Orchestrates product fetching using multiple strategies
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchCollections,
  fetchCollectionProducts,
  fetchShopFeed,
  fetchProductsDirect,
} from './api-client'
import {
  parseCollectionsResponse,
  extractCollectionHandles,
  parseOffersResponse,
  filterProductsByCollection,
} from './collection-parser'
import { transformProduct, deduplicateProducts, type TransformedProduct } from './utils'
import type { FourthwallCollection, CollectionMetadata, FourthwallApiResponse } from './types'

const COMMON_COLLECTION_HANDLES = [
  'classic',
  'the-lost-unfounds-classic-collection',
  'the-lost-unfounds-classic',
  'lost-unfounds-classic',
  'classic-collection'
]

/**
 * Handle direct products fetch (simplest case)
 */
async function handleDirectProducts(
  token: string,
  collectionHandle?: string
): Promise<{ products: TransformedProduct[] } | null> {
  const response = await fetchProductsDirect(token, collectionHandle)
  
  if (!response.ok) {
    if (response.status === 404) {
      return null // Try other strategies
    }
    throw new Error(`Direct products fetch failed: ${response.status}`)
  }
  
  const data = await response.json()
  const offers = parseOffersResponse(data)
  const products = offers.map(transformProduct)
  
  console.log(`Fourthwall API: Returning ${products.length} products from direct fetch`)
  return { products }
}

/**
 * Handle shop feed fallback
 */
async function handleShopFeed(
  token: string
): Promise<{ products: TransformedProduct[] } | null> {
  console.log('Trying shop feed endpoint to fetch all products...')
  const shopFeedResponse = await fetchShopFeed(token)
  
  if (!shopFeedResponse.ok) {
    const errorText = await shopFeedResponse.text().catch(() => '')
    console.log(`Shop feed endpoint returned ${shopFeedResponse.status}: ${errorText.substring(0, 200)}`)
    return null
  }
  
  const shopFeedData = await shopFeedResponse.json()
  console.log('Shop feed response type:', Array.isArray(shopFeedData) ? 'array' : typeof shopFeedData)
  
  const allProductsFromFeed = Array.isArray(shopFeedData) 
    ? shopFeedData 
    : (shopFeedData.offers || shopFeedData.products || shopFeedData.data || shopFeedData.items || [])
  
  if (allProductsFromFeed.length === 0) {
    return null
  }
  
  console.log(`✓ Shop feed returned ${allProductsFromFeed.length} products`)
  const products = allProductsFromFeed.map(transformProduct)
  
  return { products }
}

/**
 * Try common collection handles as fallback
 */
async function tryCommonHandles(
  token: string
): Promise<{ products: TransformedProduct[], collectionHandle: string } | null> {
  console.log('Trying common collection handles:', COMMON_COLLECTION_HANDLES)
  
  for (const handle of COMMON_COLLECTION_HANDLES) {
    try {
      const testResponse = await fetchCollectionProducts(handle, token)
      
      if (testResponse.ok) {
        const testData = await testResponse.json()
        const testOffers = parseOffersResponse(testData)
        
        if (testOffers.length > 0) {
          console.log(`Found ${testOffers.length} products using handle: ${handle}`)
          const products = testOffers.map(transformProduct)
          return { products, collectionHandle: handle }
        }
      } else {
        console.log(`Handle ${handle} returned ${testResponse.status}`)
      }
    } catch (err) {
      console.warn(`Failed to test handle ${handle}:`, err)
    }
  }
  
  return null
}

/**
 * Fetch products from a single collection
 */
async function fetchProductsFromCollection(
  collection: FourthwallCollection,
  token: string,
  allProductsFromFeed: any[]
): Promise<{ products: any[], metadata: CollectionMetadata | null }> {
  const collectionName = collection.name || collection.title || 'Unknown'
  const possibleHandles = extractCollectionHandles(collection)
  
  console.log(`Trying handles for "${collectionName}":`, possibleHandles)
  
  // Strategy 1: Try collection ID first
  if (collection.id) {
    try {
      const offersResponse = await fetchCollectionProducts(collection.id, token)
      
      if (offersResponse.ok) {
        const offersData = await offersResponse.json()
        const offers = parseOffersResponse(offersData)
        
        if (offers.length > 0) {
          console.log(`✓ Collection "${collectionName}" (ID: ${collection.id}): Found ${offers.length} products`)
          return {
            products: offers,
            metadata: {
              name: collectionName,
              handle: collection.slug || collection.id,
              status: collection.status || collection.visibility || 'unknown',
              productCount: offers.length
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch from collection ID ${collection.id}:`, err)
    }
  }
  
  // Strategy 2: Try each possible handle
  for (const handle of possibleHandles) {
    if (!handle) continue
    
    try {
      const offersResponse = await fetchCollectionProducts(handle, token)
      
      if (offersResponse.ok) {
        const offersData = await offersResponse.json()
        const offers = parseOffersResponse(offersData)
        
        if (offers.length > 0) {
          console.log(`✓ Collection "${collectionName}" (handle: ${handle}): Found ${offers.length} products`)
          return {
            products: offers,
            metadata: {
              name: collectionName,
              handle: handle,
              status: collection.status || collection.visibility || 'unknown',
              productCount: offers.length
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch from collection handle ${handle}:`, err)
    }
  }
  
  // Strategy 3: Filter from shop feed
  if (collection.id && allProductsFromFeed.length > 0) {
    console.log(`Trying fallback: Filter shop feed products by collection ID ${collection.id}`)
    const filteredOffers = filterProductsByCollection(allProductsFromFeed, collection)
    
    if (filteredOffers.length > 0) {
      console.log(`✓ Found ${filteredOffers.length} products via shop feed filtering`)
      return {
        products: filteredOffers,
        metadata: {
          name: collectionName,
          handle: collection.slug || collection.id,
          status: collection.status || 'unknown',
          productCount: filteredOffers.length
        }
      }
    }
  }
  
  // No products found
  console.warn(`⚠ Could not fetch products from collection "${collectionName}". Tried handles:`, possibleHandles)
  return {
    products: [],
    metadata: {
      name: collectionName,
      handle: possibleHandles[0] || 'unknown',
      status: collection.status || 'unknown',
      productCount: 0
    }
  }
}

/**
 * Handle collections-based product fetching
 */
async function handleCollections(
  token: string
): Promise<FourthwallApiResponse> {
  console.log('v1/products endpoint not found, trying to fetch collections first...')
  
  // Fetch collections
  const collectionsResponse = await fetchCollections(token)
  
  if (!collectionsResponse.ok) {
    const errorText = await collectionsResponse.text()
    console.error(`Collections API error: ${collectionsResponse.status}`)
    return {
      products: [],
      error: `Failed to fetch collections: ${collectionsResponse.status}`,
      message: `Collections API returned ${collectionsResponse.status}. Response: ${errorText.substring(0, 200)}`,
      errorDetails: errorText.substring(0, 500),
    }
  }
  
  const collectionsData = await collectionsResponse.json()
  console.log('Collections API response type:', Array.isArray(collectionsData) ? 'array' : typeof collectionsData)
  
  const collections = parseCollectionsResponse(collectionsData)
  console.log(`Found ${collections.length} collections after parsing`)
  
  // Log collection details
  if (collections.length > 0) {
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
  
  // Try shop feed first (fallback strategy)
  let allProductsFromFeed: any[] = []
  try {
    const shopFeedResponse = await fetchShopFeed(token)
    if (shopFeedResponse.ok) {
      const shopFeedData = await shopFeedResponse.json()
      allProductsFromFeed = Array.isArray(shopFeedData) 
        ? shopFeedData 
        : (shopFeedData.offers || shopFeedData.products || shopFeedData.data || shopFeedData.items || [])
      console.log(`✓ Shop feed returned ${allProductsFromFeed.length} products`)
    }
  } catch (err) {
    console.warn('Failed to fetch shop feed:', err)
  }
  
  // If no collections but shop feed has products, return those
  if (collections.length === 0 && allProductsFromFeed.length > 0) {
    const products = allProductsFromFeed.map(transformProduct)
    console.log(`Fourthwall API: Returning ${products.length} products from shop feed`)
    return { products }
  }
  
  // Try common handles if no collections
  if (collections.length === 0) {
    const commonHandleResult = await tryCommonHandles(token)
    if (commonHandleResult) {
      return {
        products: commonHandleResult.products,
        collectionHandle: commonHandleResult.collectionHandle,
      }
    }
  }
  
  // Fetch products from each collection
  const allOffers: any[] = []
  const collectionMetadata: CollectionMetadata[] = []
  
  for (const collection of collections) {
    const { products, metadata } = await fetchProductsFromCollection(
      collection,
      token,
      allProductsFromFeed
    )
    
    if (products.length > 0) {
      allOffers.push(...products)
    }
    
    if (metadata) {
      collectionMetadata.push(metadata)
    }
  }
  
  // Deduplicate and transform
  const transformedProducts = deduplicateProducts(allOffers.map(transformProduct))
  
  console.log(`Fourthwall API: Returning ${transformedProducts.length} unique products from collections (${allOffers.length} total before deduplication)`)
  
  return {
    products: transformedProducts,
    collections: collectionMetadata,
    totalCollections: collections.length,
  }
}

/**
 * Main handler function
 */
export async function handleFourthwallProducts(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN
    const collectionHandle = req.query.collection as string | undefined
    
    console.log('Collection handle from query:', collectionHandle)
    
    if (!storefrontToken) {
      console.error('FOURTHWALL_STOREFRONT_TOKEN not configured')
      res.status(200).json({
        products: [],
        error: 'FOURTHWALL_STOREFRONT_TOKEN not configured',
        message: 'FOURTHWALL_STOREFRONT_TOKEN not configured. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers',
      })
      return
    }

    console.log(`Fourthwall API: Token present: ${!!storefrontToken}, Length: ${storefrontToken.length}`)
    
    // Strategy 1: Always try direct products fetch first
    try {
      const directResult = await handleDirectProducts(storefrontToken, collectionHandle)
      if (directResult && directResult.products.length > 0) {
        res.status(200).json(directResult)
        return
      }
    } catch (error) {
      // If direct fetch throws (non-404 error), log but continue to fallback
      console.warn('Direct products fetch error (will try fallback):', error)
    }
    
    // Strategy 2: If direct fetch failed or returned no products, try collections approach
    // Only do this if no specific collection was requested (original behavior)
    if (!collectionHandle || collectionHandle === 'all') {
      const collectionsResult = await handleCollections(storefrontToken)
      res.status(200).json(collectionsResult)
      return
    }
    
    // Strategy 3: Specific collection requested but direct fetch failed
    res.status(200).json({
      products: [],
      error: `Failed to fetch products from collection: ${collectionHandle}`,
      message: `Failed to fetch products from collection: ${collectionHandle}`,
    })
    
  } catch (error) {
    console.error('Error fetching Fourthwall products:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      error: 'Failed to fetch products',
      message: errorMessage,
    })
  }
}
