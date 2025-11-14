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
      const response = await fetch(`/api/fourthwall/products`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }

      const data = await response.json()
      return { products: data.products || [], error: null }
    } catch (error) {
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
