/**
 * Checkout Utilities
 *
 * Utilities for generating checkout URLs with affiliate tracking.
 * Active payment paths:
 *   - Stripe (cards, hosted checkout)            → getStripeCheckoutUrl
 *   - Strike (Bitcoin Lightning, on-site QR)     → getStrikeCheckoutInvoice
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
 * Create a Stripe Checkout Session keyed by a pre-existing Stripe Price ID.
 * Use this for native products configured in the Stripe dashboard (e.g., the
 * Mystery Box). Returns the hosted-checkout URL — the caller should redirect
 * the browser to `url`.
 *
 * Compared to `getStripeCheckoutUrl` below, this path delegates pricing and
 * tax/shipping config to the Stripe Price object instead of inlining a
 * one-shot price_data block.
 */
export async function getStripeCheckoutUrlByPriceId(params: {
    priceId: string
    quantity?: number
    productKind?: 'physical' | 'digital'
    customerEmail?: string
    productId?: string
    affiliateRef?: string | null
}): Promise<{ sessionId: string; url: string; shopOrderId: string }> {
    let affiliateRef = params.affiliateRef
    if (!affiliateRef && typeof window !== 'undefined') {
        const { getAffiliateRef } = await import('./affiliate-tracking')
        affiliateRef = getAffiliateRef()
    }

    const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(affiliateRef ? { 'X-Affiliate-Ref': affiliateRef } : {}),
        },
        body: JSON.stringify({
            priceId: params.priceId,
            quantity: params.quantity || 1,
            productKind: params.productKind || 'physical',
            customerEmail: params.customerEmail,
            productId: params.productId,
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Checkout creation failed' }))
        throw new Error(error.error || 'Failed to create Stripe checkout session')
    }

    const data = await response.json()
    if (!data.url || !data.sessionId) {
        throw new Error('Invalid response from create-session API')
    }
    if (!/^https?:\/\//i.test(data.url)) {
        throw new Error('Invalid checkout URL returned')
    }
    return { sessionId: data.sessionId, url: data.url, shopOrderId: data.shopOrderId }
}

/**
 * Create a Stripe Checkout Session for a Prodigi print-on-demand product.
 * Stripe collects the shipping address on its hosted page, so no address
 * form is needed client-side for this path.
 */
export async function getProdigiCheckoutUrl(params: {
  productId: string
  quantity?: number
  customerEmail?: string
  affiliateRef?: string | null
}): Promise<{ sessionId: string; url: string; shopOrderId: string }> {
  let affiliateRef = params.affiliateRef
  if (!affiliateRef && typeof window !== 'undefined') {
    const { getAffiliateRef } = await import('./affiliate-tracking')
    affiliateRef = getAffiliateRef()
  }

  const response = await fetch('/api/prodigi/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(affiliateRef ? { 'X-Affiliate-Ref': affiliateRef } : {}),
    },
    body: JSON.stringify({
      productId: params.productId,
      quantity: params.quantity || 1,
      customerEmail: params.customerEmail,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Checkout creation failed' }))
    throw new Error(error.error || 'Failed to create Prodigi checkout session')
  }

  const data = await response.json()
  if (!data.url || !data.sessionId) {
    throw new Error('Invalid response from Prodigi checkout API')
  }
  return { sessionId: data.sessionId, url: data.url, shopOrderId: data.shopOrderId }
}

export interface ProdigiShippingRecipient {
  name: string
  email: string
  address: {
    line1: string
    line2?: string
    postalOrZipCode: string
    countryCode: string
    townOrCity: string
    stateOrCounty?: string
  }
}

/**
 * Create a Strike (Bitcoin Lightning) invoice for a Prodigi print product.
 * Unlike getStrikeCheckoutInvoice, this requires a shipping recipient since
 * Strike's hosted invoice has no address-collection step.
 */
export async function getProdigiStrikeInvoice(params: {
  productId: string
  recipient: ProdigiShippingRecipient
  affiliateRef?: string | null
}): Promise<{
  invoiceId: string
  lnInvoice: string
  expirationInSec: number
  amount: { amount: string; currency: string }
  description: string
}> {
  let affiliateRef = params.affiliateRef
  if (!affiliateRef && typeof window !== 'undefined') {
    const { getAffiliateRef } = await import('./affiliate-tracking')
    affiliateRef = getAffiliateRef()
  }

  const response = await fetch('/api/prodigi/checkout-strike', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(affiliateRef ? { 'X-Affiliate-Ref': affiliateRef } : {}),
    },
    body: JSON.stringify({ productId: params.productId, recipient: params.recipient }),
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
 * Create a Stripe Checkout Session and return the hosted-checkout URL.
 * The caller should redirect the browser to `url` (window.location = url).
 */
export async function getStripeCheckoutUrl(params: {
  amount: number
  currency?: string
  description?: string
  productId?: string
  variantId?: string
  affiliateRef?: string | null
}): Promise<{ sessionId: string; url: string }> {
  // Get affiliate ref if not provided
  let affiliateRef = params.affiliateRef
  if (!affiliateRef && typeof window !== 'undefined') {
    const { getAffiliateRef } = await import('./affiliate-tracking')
    affiliateRef = getAffiliateRef()
  }

  const response = await fetch('/api/shop/payments/stripe', {
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
    throw new Error(error.error || 'Failed to create Stripe checkout session')
  }

  const data = await response.json()

  if (!data.success || !data.url || !data.sessionId) {
    throw new Error('Invalid response from Stripe API')
  }

  // Sanity-check that we got an actual https URL back
  if (!/^https?:\/\//i.test(data.url)) {
    throw new Error('Invalid checkout URL returned from Stripe API')
  }

  return {
    sessionId: data.sessionId,
    url: data.url,
  }
}
