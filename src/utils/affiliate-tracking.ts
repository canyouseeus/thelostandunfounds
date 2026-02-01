/**
 * Affiliate Tracking Utilities
 * 
 * Client-side utilities for affiliate tracking:
 * - Get affiliate reference from URL params, cookies, or localStorage
 * - Track affiliate clicks
 * - Set affiliate cookie/storage for checkout tracking
 * - Track customer-to-affiliate binding
 */

const AFFILIATE_COOKIE_NAME = 'affiliate_ref'
const AFFILIATE_COOKIE_EXPIRY_DAYS = 30

const AFFILIATE_SUBID_COOKIE_NAME = 'affiliate_subid'

/**
 * Get affiliate reference from URL query parameter, cookie, or localStorage
 * Checks URL params first -> cookie -> localStorage
 */
export function getAffiliateRef(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Check URL query parameter first (e.g., ?ref=CODE or ?affiliate=CODE)
  const params = new URLSearchParams(window.location.search)
  const urlRef = params.get('ref') || params.get('affiliate') || params.get('aff')

  // Also capture Sub-ID / Campaign if present
  const subId = params.get('subid') || params.get('sid') || params.get('campaign')
  if (subId) {
    setAffiliateSubId(subId)
  }

  if (urlRef) {
    console.log(`🔗 URL parameter detected: ${urlRef} (updating storage)`)
    setAffiliateRef(urlRef)

    // Optionally remove ref from URL without reloading for cleaner UX
    const url = new URL(window.location.href)
    url.searchParams.delete('ref')
    url.searchParams.delete('affiliate')
    url.searchParams.delete('aff')
    // Don't remove subid yet, maybe user wants to see it? Or cleaner to remove.
    url.searchParams.delete('subid')
    url.searchParams.delete('sid')
    url.searchParams.delete('campaign')

    window.history.replaceState({}, '', url.toString())

    return urlRef
  }

  // 2. Fall back to cookie
  const cookieRef = getAffiliateCookie()
  if (cookieRef) {
    return cookieRef
  }

  // 3. Fall back to localStorage
  return localStorage.getItem(AFFILIATE_COOKIE_NAME)
}

/**
 * Get affiliate sub-id from storage
 */
export function getAffiliateSubId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AFFILIATE_SUBID_COOKIE_NAME)
}

/**
 * Set affiliate sub-id
 */
export function setAffiliateSubId(subId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AFFILIATE_SUBID_COOKIE_NAME, subId)
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
 * Set affiliate reference (Cookie + LocalStorage)
 */
export function setAffiliateRef(affiliateCode: string): void {
  if (typeof window === 'undefined') return

  // Set Cookie
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + AFFILIATE_COOKIE_EXPIRY_DAYS)
  document.cookie = `${AFFILIATE_COOKIE_NAME}=${encodeURIComponent(affiliateCode)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`

  // Set LocalStorage (Redundancy)
  localStorage.setItem(AFFILIATE_COOKIE_NAME, affiliateCode)
  localStorage.setItem(`${AFFILIATE_COOKIE_NAME}_timestamp`, new Date().toISOString())
}

/**
 * Set affiliate reference cookie (Deprecated alias for setAffiliateRef)
 */
export function setAffiliateCookie(affiliateCode: string): void {
  setAffiliateRef(affiliateCode)
}

/**
 * Clear affiliate reference
 */
export function clearAffiliateRef(): void {
  if (typeof window === 'undefined') return

  // Clear Cookie
  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`

  // Clear LocalStorage
  localStorage.removeItem(AFFILIATE_COOKIE_NAME)
  localStorage.removeItem(`${AFFILIATE_COOKIE_NAME}_timestamp`)
}

/**
 * Clear affiliate reference cookie (Deprecated alias for clearAffiliateRef)
 */
export function clearAffiliateCookie(): void {
  clearAffiliateRef()
}

/**
 * Track affiliate click
 * Calls the API endpoint to increment click count for the affiliate
 */
export async function trackAffiliateClick(affiliateCode: string): Promise<boolean> {
  if (!affiliateCode) return false

  // Get Sub-ID / Campaign if available
  const subId = getAffiliateSubId()

  try {
    console.log('📡 Tracking affiliate click:', affiliateCode, subId ? `(SubID: ${subId})` : '')
    const response = await fetch('/api/shop/affiliates/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        affiliateCode,
        metadata: subId ? { sub_id: subId } : undefined
      }),
    })

    if (!response.ok) {
      // Don't log error as warning to avoid console noise, just return false
      // Common if user is offline or adblocker is active
      return false
    }

    const data = await response.json()
    return data.success === true
  } catch (error) {
    return false
  }
}

/**
 * Initialize affiliate tracking on page load
 * Checks for affiliate ref and tracks the click if present
 */
export function initAffiliateTracking(): void {
  if (typeof window === 'undefined') return

  // getAffiliateRef handles URL checking and storage updates
  const affiliateRef = getAffiliateRef()

  if (affiliateRef) {
    // Track the click asynchronously
    // We only track if we haven't tracked heavily recently? 
    // Current logic tracks every page load which might be excessive but acceptable for now.
    // Ideally we'd session-lock this but keeping it simple as per original logic.
    trackAffiliateClick(affiliateRef).catch(() => { })
  }
}

/**
 * Get affiliate reference for API requests
 */
export function getAffiliateRefForRequest(): string | null {
  return getAffiliateRef()
}

/**
 * Track customer to affiliate binding (Backend Permanent Link)
 */
export async function trackCustomerToAffiliate(
  email: string,
  userId?: string,
  affiliateCode?: string
): Promise<any> {
  const code = affiliateCode || getAffiliateRef()

  if (!code) {
    return { success: false, error: 'No affiliate code' }
  }

  try {
    const response = await fetch('/api/affiliates/track-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        user_id: userId,
        affiliate_code: code
      })
    })

    return await response.json()
  } catch (error) {
    console.error('Error tracking customer:', error)
    return { success: false, error: 'Failed to track customer' }
  }
}

/**
 * Check if customer is already tied to an affiliate
 */
export async function checkCustomerAffiliate(email: string): Promise<any> {
  try {
    const response = await fetch(`/api/affiliates/check-customer?email=${encodeURIComponent(email)}`)
    return await response.json()
  } catch (error) {
    return { found: false }
  }
}


