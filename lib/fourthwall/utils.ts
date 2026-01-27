/**
 * Utility functions for Fourthwall API data transformation
 */

/**
 * Decode HTML entities in text
 */
export function decodeHtmlEntities(text: string): string {
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
export function extractImageUrls(images: any): string[] {
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
 * Strip HTML tags from text and clean up whitespace
 */
export function stripHtmlTags(text: string): string {
  if (!text) return text
  // Remove HTML tags and decode entities
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Transform a Fourthwall offer/product to our product format
 */
export interface TransformedProduct {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice?: number
  currency: string
  images: string[]
  handle: string
  available: boolean
  variants: any[]
  url: string
}

export function transformProduct(offer: any): TransformedProduct {
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
}

/**
 * Deduplicate products by ID
 */
export function deduplicateProducts(products: TransformedProduct[]): TransformedProduct[] {
  const productMap = new Map<string, TransformedProduct>()
  
  products.forEach((product) => {
    if (!productMap.has(product.id)) {
      productMap.set(product.id, product)
    }
  })
  
  return Array.from(productMap.values())
}
