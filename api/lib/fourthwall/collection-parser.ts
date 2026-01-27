/**
 * Collection parsing utilities for Fourthwall API responses
 */

import type { FourthwallCollection } from './types'

/**
 * Parse collections from various API response formats
 */
export function parseCollectionsResponse(collectionsData: any): FourthwallCollection[] {
  // Format 1: Array directly
  if (Array.isArray(collectionsData)) {
    console.log('Parsed collections as direct array')
    return collectionsData
  }
  
  // Format 2: Nested object with collections key
  if (collectionsData.collections && Array.isArray(collectionsData.collections)) {
    console.log('Parsed collections from collectionsData.collections')
    return collectionsData.collections
  }
  
  // Format 3: Data wrapper
  if (collectionsData.data && Array.isArray(collectionsData.data)) {
    console.log('Parsed collections from collectionsData.data')
    return collectionsData.data
  }
  
  // Format 4: Items wrapper
  if (collectionsData.items && Array.isArray(collectionsData.items)) {
    console.log('Parsed collections from collectionsData.items')
    return collectionsData.items
  }
  
  // Format 5: Results wrapper
  if (collectionsData.results && Array.isArray(collectionsData.results)) {
    console.log('Parsed collections from collectionsData.results')
    return collectionsData.results
  }
  
  // Format 6: Single collection object wrapped
  if (collectionsData.id || collectionsData.handle || collectionsData.slug) {
    console.log('Parsed single collection object')
    return [collectionsData]
  }
  
  return []
}

/**
 * Extract possible collection handles from a collection object
 */
export function extractCollectionHandles(collection: FourthwallCollection): string[] {
  const possibleHandles: (string | null)[] = [
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
    
    // Detect "classic" in collection name
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
  ]
  
  // Remove duplicates and nulls
  const uniqueHandles = [...new Set(possibleHandles.filter(Boolean))] as string[]
  return uniqueHandles
}

/**
 * Parse products/offers from API response
 */
export function parseOffersResponse(responseData: any): any[] {
  if (Array.isArray(responseData)) {
    return responseData
  }
  
  return responseData.results || 
         responseData.offers || 
         responseData.data || 
         responseData.items || 
         []
}

/**
 * Filter products from shop feed by collection
 */
export function filterProductsByCollection(
  products: any[],
  collection: FourthwallCollection
): any[] {
  return products.filter((offer: any) => {
    const offerCollectionId = offer.collection_id || offer.collection?.id || offer.collections?.[0]?.id
    const offerCollectionSlug = offer.collection_slug || offer.collection?.slug || offer.collections?.[0]?.slug
    const offerCollectionHandle = offer.collection_handle || offer.collection?.handle || offer.collections?.[0]?.handle
    
    return offerCollectionId === collection.id ||
           offerCollectionId === collection.id?.replace('col_', '') ||
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
}
