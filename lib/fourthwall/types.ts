/**
 * TypeScript types for Fourthwall API
 */

export interface FourthwallCollection {
  id?: string
  handle?: string
  slug?: string
  name?: string
  title?: string
  url?: string
  permalink?: string
  status?: string
  visibility?: string
  products?: any[]
  product_count?: number
  [key: string]: any
}

export interface FourthwallOffer {
  id?: string
  slug?: string
  handle?: string
  name?: string
  title?: string
  description?: string
  images?: any
  image?: any
  variants?: any[]
  available?: boolean
  collection_id?: string
  collection_slug?: string
  collection_handle?: string
  collection?: {
    id?: string
    slug?: string
    handle?: string
  }
  collections?: Array<{
    id?: string
    slug?: string
    handle?: string
  }>
  [key: string]: any
}

export interface CollectionMetadata {
  name: string
  handle: string
  status: string
  productCount: number
}

export interface FourthwallApiResponse {
  products: any[]
  collections?: CollectionMetadata[]
  totalCollections?: number
  error?: string
  message?: string
  errorDetails?: string
  collectionHandle?: string
}
