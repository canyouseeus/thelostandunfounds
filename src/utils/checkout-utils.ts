/**
 * Checkout Utilities
 * 
 * Utilities for generating checkout URLs with affiliate tracking
 * For native products using PayPal
 */

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

