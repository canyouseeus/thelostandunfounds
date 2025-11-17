/**
 * Affiliate Tracking Utility
 * 
 * Handles affiliate link tracking and cookie management
 */

const AFFILIATE_COOKIE_NAME = 'affiliate_ref'
const AFFILIATE_COOKIE_EXPIRY_DAYS = 30

/**
 * Get affiliate reference from URL parameter or cookie
 */
export function getAffiliateRef(): string | null {
  // Check URL parameter first (highest priority)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    if (ref) {
      // Store in cookie for future requests
      setAffiliateCookie(ref)
      return ref
    }
  }

  // Check cookie
  return getAffiliateCookie()
}

/**
 * Set affiliate cookie
 */
function setAffiliateCookie(ref: string): void {
  if (typeof document === 'undefined') return

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + AFFILIATE_COOKIE_EXPIRY_DAYS)

  document.cookie = `${AFFILIATE_COOKIE_NAME}=${ref}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Get affiliate cookie value
 */
function getAffiliateCookie(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === AFFILIATE_COOKIE_NAME && value) {
      return value
    }
  }

  return null
}

/**
 * Track affiliate click
 * Called when user clicks on a product link
 */
export async function trackAffiliateClick(affiliateCode: string): Promise<void> {
  try {
    await fetch('/api/affiliates/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ affiliateCode }),
    })
  } catch (error) {
    console.error('Failed to track affiliate click:', error)
    // Don't throw - tracking failures shouldn't break the user experience
  }
}

/**
 * Clear affiliate cookie
 */
export function clearAffiliateRef(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

