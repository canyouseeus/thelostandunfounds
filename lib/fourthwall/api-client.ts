/**
 * Fourthwall API Client
 * Handles all API communication with Fourthwall Storefront API
 */

const BASE_URL = 'https://storefront-api.fourthwall.com'

export interface ApiRequestOptions {
  storefrontToken: string
  collectionHandle?: string
}

/**
 * Build API URL based on collection handle
 */
export function buildApiUrl(collectionHandle?: string): string {
  if (collectionHandle && collectionHandle !== 'all') {
    return `${BASE_URL}/v1/collections/${collectionHandle}/products`
  }
  return `${BASE_URL}/v1/products`
}

/**
 * Fetch with multiple authentication methods
 */
async function fetchWithAuth(url: string, token: string): Promise<Response> {
  // Try query parameter first (standard approach)
  let response = await fetch(`${url}?storefront_token=${token}`, {
    headers: { 'Accept': 'application/json' },
  })

  // If that fails, try Authorization header
  if (!response.ok && response.status === 404) {
    console.log('Trying Authorization header instead of query parameter...')
    response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  // If still fails, try X-Storefront-Token header
  if (!response.ok && response.status === 404) {
    console.log('Trying X-Storefront-Token header...')
    response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Storefront-Token': token,
      },
    })
  }

  return response
}

/**
 * Fetch collections from Fourthwall API
 */
export async function fetchCollections(token: string): Promise<Response> {
  const url = `${BASE_URL}/v1/collections?storefront_token=${token}`
  return fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
}

/**
 * Fetch products from a specific collection
 */
export async function fetchCollectionProducts(
  collectionIdOrHandle: string,
  token: string
): Promise<Response> {
  const url = `${BASE_URL}/v1/collections/${collectionIdOrHandle}/products?storefront_token=${token}`
  return fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
}

/**
 * Fetch all products from shop feed
 */
export async function fetchShopFeed(token: string): Promise<Response> {
  const url = `${BASE_URL}/v1/shop/feed?storefront_token=${token}`
  return fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
}

/**
 * Fetch products directly (all products endpoint)
 */
export async function fetchProductsDirect(
  token: string,
  collectionHandle?: string
): Promise<Response> {
  const apiUrl = buildApiUrl(collectionHandle)
  return fetchWithAuth(apiUrl, token)
}
