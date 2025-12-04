/**
 * Affiliate Tracking Utilities
 * 
 * Client-side utilities for affiliate tracking:
 * - Get affiliate reference from URL params or cookies
 * - Track affiliate clicks
 * - Set affiliate cookie for checkout tracking
 */

const AFFILIATE_COOKIE_NAME = 'affiliate_ref'
const AFFILIATE_COOKIE_EXPIRY_DAYS = 30

/**
 * Get affiliate reference from URL query parameter or cookie
 * Checks URL params first, then falls back to cookie
 */
export function getAffiliateRef(): string | null {
  if (typeof window === 'undefined') return null

  // Check URL query parameter first (e.g., ?ref=CODE or ?affiliate=CODE)
  // URL params take precedence over cookies
  const params = new URLSearchParams(window.location.search)
  const urlRef = params.get('ref') || params.get('affiliate') || params.get('aff')
  
  if (urlRef) {
    // URL parameter takes precedence - update cookie with new value
    console.log(`🔗 URL parameter detected: ${urlRef} (overriding any existing cookie)`)
    setAffiliateCookie(urlRef)
    return urlRef
  }

  // Fall back to cookie only if no URL parameter
  const cookieRef = getAffiliateCookie()
  if (cookieRef) {
    console.log(`🍪 Using affiliate from cookie: ${cookieRef}`)
  }
  return cookieRef
}

/**
 * Get affiliate reference from cookie
 */
export function getAffiliateCookie(): string | null {
  if (typeof window === 'undefined') return null

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === AFFILIATE_COOKIE_NAME) {
      return decodeURIComponent(value)
    }
  }

  return null
}

/**
 * Set affiliate reference cookie
 */
export function setAffiliateCookie(affiliateCode: string): void {
  if (typeof window === 'undefined') return

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + AFFILIATE_COOKIE_EXPIRY_DAYS)

  document.cookie = `${AFFILIATE_COOKIE_NAME}=${encodeURIComponent(affiliateCode)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
}

/**
 * Clear affiliate reference cookie
 */
export function clearAffiliateCookie(): void {
  if (typeof window === 'undefined') return

  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Track affiliate click
 * Calls the API endpoint to increment click count for the affiliate
 */
export async function trackAffiliateClick(affiliateCode: string): Promise<boolean> {
  if (!affiliateCode) return false

  try {
    console.log('📡 Tracking affiliate click:', affiliateCode)
    const response = await fetch('/api/shop/affiliates/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ affiliateCode }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('⚠️ Failed to track affiliate click:', response.status, response.statusText, errorText)
      return false
    }

    const data = await response.json()
    console.log('📊 Tracking response:', data)
    return data.success === true
  } catch (error) {
    console.error('❌ Error tracking affiliate click:', error)
    return false
  }
}

/**
 * Initialize affiliate tracking on page load
 * Checks for affiliate ref in URL and sets cookie if found
 * Also tracks the click if affiliate ref is present
 */
export function initAffiliateTracking(): void {
  if (typeof window === 'undefined') return

  const affiliateRef = getAffiliateRef()
  
  if (affiliateRef) {
    console.log('🔗 Affiliate ref detected:', affiliateRef)
    // Track the click asynchronously (don't block page load)
    trackAffiliateClick(affiliateRef)
      .then((success) => {
        if (success) {
          console.log('✅ Affiliate click tracked successfully:', affiliateRef)
        } else {
          console.warn('⚠️ Affiliate click tracking returned false:', affiliateRef)
        }
      })
      .catch((error) => {
        console.error('❌ Failed to track affiliate click:', error)
      })
  } else {
    console.log('ℹ️ No affiliate ref found in URL or cookie')
  }
}

/**
 * Get affiliate reference for API requests
 * Returns the affiliate ref to include in headers or request body
 */
export function getAffiliateRefForRequest(): string | null {
  return getAffiliateRef()
}


