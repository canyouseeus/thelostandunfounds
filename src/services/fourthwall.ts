/**
 * Fourthwall Shop Integration Service
 * Fetches products from Fourthwall store
 */

export interface FourthwallProduct {
  id: string
  title: string
  description?: string
  price: number
  compareAtPrice?: number
  currency: string
  images: string[]
  handle: string
  available: boolean
  variants?: Array<{
    id: string
    title: string
    price: number
    available: boolean
  }>
  url?: string
}

export interface FourthwallCollection {
  id: string
  title: string
  handle: string
  products: FourthwallProduct[]
}

class FourthwallService {
  private storeSlug: string

  constructor() {
    // Extract store slug from the provided URL
    // https://thelostandunfounds-shop.fourthwall.com -> thelostandunfounds-shop
    this.storeSlug = 'thelostandunfounds-shop'
  }

  /**
   * Fetch all products from the store
   */
  async getProducts(): Promise<{ products: FourthwallProduct[]; error: Error | null }> {
    try {
      // In local development, API routes don't work unless using `vercel dev`
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      
      const response = await fetch(`/api/fourthwall/products`)
      
      if (!response.ok) {
        // Handle 404 in local dev gracefully
        if (response.status === 404 && isLocalDev) {
          return { 
            products: [], 
            error: new Error('API routes only work in production or when using `npx vercel dev` for local development') 
          }
        }
        
        const errorText = await response.text().catch(() => response.statusText)
        const errorData = (() => {
          try {
            return JSON.parse(errorText)
          } catch {
            return { message: errorText }
          }
        })()
        
        const errorMessage = errorData.message || errorData.error || `Failed to fetch products: ${response.status} ${response.statusText}`
        return { products: [], error: new Error(errorMessage) }
      }

      const data = await response.json()
      
      // Check if API returned an error message
      if (data.error || data.message) {
        const errorMessage = data.error || data.message
        console.warn('Fourthwall API returned error:', errorMessage)
        // Always return error if API explicitly says there's an error
        return { products: data.products || [], error: new Error(errorMessage) }
      }
      
      // Log successful response
      const products = data.products || []
      console.log(`Fourthwall service: Received ${products.length} products`)
      return { products, error: null }
    } catch (error) {
      // Handle CORS and network errors gracefully
      if (error instanceof TypeError) {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        if (isLocalDev) {
          return { 
            products: [], 
            error: new Error('API routes only work in production deployment. Use `npx vercel dev` for local API testing.') 
          }
        }
        return { products: [], error: new Error('Network error: Unable to reach API') }
      }
      console.error('Error fetching Fourthwall products:', error)
      return { products: [], error: error as Error }
    }
  }

  /**
   * Fetch products from a specific collection
   */
  async getCollectionProducts(collectionHandle: string): Promise<{ products: FourthwallProduct[]; error: Error | null }> {
    try {
      const response = await fetch(`/api/fourthwall/collections/${collectionHandle}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`)
      }

      const data = await response.json()
      return { products: data.products || [], error: null }
    } catch (error) {
      console.error('Error fetching Fourthwall collection:', error)
      return { products: [], error: error as Error }
    }
  }

  /**
   * Get product URL for external link
   */
  getProductUrl(productHandle: string): string {
    return `https://${this.storeSlug}.fourthwall.com/products/${productHandle}`
  }

  /**
   * Get store URL
   */
  getStoreUrl(): string {
    return `https://${this.storeSlug}.fourthwall.com`
  }
}

export const fourthwallService = new FourthwallService()

