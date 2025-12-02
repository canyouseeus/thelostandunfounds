/**
 * Fourthwall Checkout Utilities
 * 
 * Utilities for generating checkout URLs with affiliate tracking
 */

/**
 * Generate checkout URL for Fourthwall product
 * Includes affiliate tracking if available
 */
export function getCheckoutUrl(
  productUrl: string,
  affiliateRef?: string | null
): string {
  if (!productUrl) {
    throw new Error('Product URL is required')
  }

  // If no affiliate ref provided, try to get from tracking utilities
  if (!affiliateRef && typeof window !== 'undefined') {
    // Import dynamically to avoid circular dependencies
    import('./affiliate-tracking').then(({ getAffiliateRef }) => {
      affiliateRef = getAffiliateRef()
    })
  }

  // If still no affiliate ref, return original URL
  if (!affiliateRef) {
    return productUrl
  }

  // Add affiliate ref to URL
  const url = new URL(productUrl)
  
  // Fourthwall uses 'ref' parameter for affiliate tracking
  url.searchParams.set('ref', affiliateRef)
  
  // Also set in custom fields if Fourthwall supports it
  // Some platforms use 'affiliate' or 'aff' as well
  url.searchParams.set('affiliate', affiliateRef)

  return url.toString()
}

/**
 * Generate checkout URL with multiple tracking parameters
 * Useful for platforms that support multiple tracking methods
 */
export function getCheckoutUrlWithTracking(
  productUrl: string,
  options?: {
    affiliateRef?: string | null
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
): string {
  if (!productUrl) {
    throw new Error('Product URL is required')
  }

  const url = new URL(productUrl)

  // Add affiliate tracking
  if (options?.affiliateRef) {
    url.searchParams.set('ref', options.affiliateRef)
    url.searchParams.set('affiliate', options.affiliateRef)
  }

  // Add UTM parameters if provided
  if (options?.utmSource) {
    url.searchParams.set('utm_source', options.utmSource)
  }
  if (options?.utmMedium) {
    url.searchParams.set('utm_medium', options.utmMedium)
  }
  if (options?.utmCampaign) {
    url.searchParams.set('utm_campaign', options.utmCampaign)
  }

  return url.toString()
}

/**
 * Generate PayPal checkout URL with affiliate tracking
 * Creates a PayPal payment order and returns approval URL
 */
export async function getPayPalCheckoutUrl(params: {
  amount: number
  currency?: string
  description?: string
  productId?: string
  variantId?: string
  affiliateRef?: string | null
}): Promise<{ orderId: string; approvalUrl: string }> {
  // Get affiliate ref if not provided
  let affiliateRef = params.affiliateRef
  if (!affiliateRef && typeof window !== 'undefined') {
    const { getAffiliateRef } = await import('./affiliate-tracking')
    affiliateRef = getAffiliateRef()
  }

  const response = await fetch('/api/shop/payments/paypal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include affiliate ref in header as fallback
      ...(affiliateRef ? { 'X-Affiliate-Ref': affiliateRef } : {}),
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency || 'USD',
      description: params.description,
      productId: params.productId,
      variantId: params.variantId,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Payment creation failed' }))
    throw new Error(error.error || 'Failed to create PayPal payment')
  }

  const data = await response.json()
  
  if (!data.success || !data.approvalUrl) {
    throw new Error('Invalid response from PayPal API')
  }

  return {
    orderId: data.orderId,
    approvalUrl: data.approvalUrl,
  }
}


