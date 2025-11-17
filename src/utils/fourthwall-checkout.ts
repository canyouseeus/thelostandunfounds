/**
 * Fourthwall Checkout Utility
 * 
 * Generates checkout URLs with affiliate tracking
 */

import { getAffiliateRef } from './affiliate-tracking'

const FOURTHWALL_STORE_SLUG = 'thelostandunfounds-shop'

/**
 * Get Fourthwall checkout URL with affiliate tracking
 * 
 * @param productHandle - Product handle/slug
 * @param variantId - Optional variant ID
 * @returns Checkout URL with affiliate parameter
 */
export function getCheckoutUrl(productHandle: string, variantId?: string): string {
  const baseUrl = `https://${FOURTHWALL_STORE_SLUG}.fourthwall.com/products/${productHandle}`
  const affiliateRef = getAffiliateRef()

  const params = new URLSearchParams()
  
  if (variantId) {
    params.append('variant', variantId)
  }
  
  if (affiliateRef) {
    params.append('ref', affiliateRef)
  }

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Get product URL (for viewing, not checkout)
 */
export function getProductUrl(productHandle: string): string {
  return `https://${FOURTHWALL_STORE_SLUG}.fourthwall.com/products/${productHandle}`
}

