/**
 * Checkout Utilities
 * 
 * Utilities for generating checkout URLs with affiliate tracking.
 * Default: Strike (Bitcoin Lightning) checkout
 * Fallback: PayPal checkout (when available)
 */

/**
 * Create a Strike (Bitcoin Lightning) invoice for checkout.
 * Returns the invoiceId and Lightning bolt11 invoice string for QR display.
 */
export async function getStrikeCheckoutInvoice(params: {
  amount: number
  currency?: string
  description?: string
  productId?: string
  variantId?: string
  affiliateRef?: string | null
}): Promise<{
  invoiceId: string
  lnInvoice: string
  expirationInSec: number
  amount: { amount: string; currency: string }
  description: string
}> {
  // Get affiliate ref if not provided
  let affiliateRef = params.affiliateRef
  if (!affiliateRef && typeof window !== 'undefined') {
    const { getAffiliateRef } = await import('./affiliate-tracking')
    affiliateRef = getAffiliateRef()
  }

  const response = await fetch('/api/shop/payments/strike', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    throw new Error(error.error || 'Failed to create Strike invoice')
  }

  const data = await response.json()

  if (!data.success || !data.lnInvoice) {
    throw new Error('Invalid response from Strike API')
  }

  return {
    invoiceId: data.invoiceId,
    lnInvoice: data.lnInvoice,
    expirationInSec: data.expirationInSec,
    amount: data.amount,
    description: data.description,
  }
}

/**
 * Poll Strike invoice status until paid, expired, or cancelled.
 * Returns the final state.
 */
export async function pollStrikeInvoiceStatus(
  invoiceId: string,
  onStateChange?: (state: string) => void,
  options?: { intervalMs?: number; maxAttempts?: number }
): Promise<string> {
  const intervalMs = options?.intervalMs || 3000
  const maxAttempts = options?.maxAttempts || 120 // ~6 minutes at 3s intervals

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`/api/shop/payments/strike/status?invoiceId=${invoiceId}`)

      if (!response.ok) {
        console.warn('⚠️ Strike status check failed:', response.status)
        await new Promise(r => setTimeout(r, intervalMs))
        continue
      }

      const data = await response.json()
      const state = data.state

      onStateChange?.(state)

      // Terminal states
      if (state === 'PAID') {
        return 'PAID'
      }
      if (state === 'CANCELLED') {
        return 'CANCELLED'
      }
    } catch (error) {
      console.warn('⚠️ Strike status poll error:', error)
    }

    await new Promise(r => setTimeout(r, intervalMs))
  }

  return 'TIMEOUT'
}

/**
 * Generate PayPal checkout URL with affiliate tracking (legacy/fallback)
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

  const approvalUrl: string = data.approvalUrl
  // Safety: block old mock URLs from redirecting
  if (approvalUrl.includes('example.com/dev-paypal-approval')) {
    throw new Error('PayPal API unavailable (mock URL returned). Make sure the API is running with valid PayPal credentials.')
  }
  // Basic sanity: ensure it looks like an http(s) URL
  if (!/^https?:\/\//i.test(approvalUrl)) {
    throw new Error('Invalid approval URL returned from PayPal API')
  }

  return {
    orderId: data.orderId,
    approvalUrl,
  }
}
