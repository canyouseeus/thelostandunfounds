/**
 * Affiliate Tracking Utilities
 * 
 * Client-side utilities for affiliate tracking:
 * - Get affiliate reference from URL params, cookies, or localStorage
 * - Track affiliate clicks
 * - Set affiliate cookie/storage for checkout tracking
 * - Track customer-to-affiliate binding
 */

import { mayStoreNonEssential, subscribeConsent } from './consent'

const AFFILIATE_COOKIE_NAME = 'affiliate_ref'
const AFFILIATE_COOKIE_EXPIRY_DAYS = 30

const AFFILIATE_SUBID_COOKIE_NAME = 'affiliate_subid'

/**
 * Referral details seen on this page load but not yet allowed to be written to
 * disk, because the consent gate has not resolved (or was declined).
 *
 * Attribution is marketing storage, so in the EU/UK it waits for a yes. Holding
 * the value in memory means a visitor who consents a moment later still gets
 * their referrer credited, instead of the code silently losing the ref because
 * the URL parameter was stripped before the answer arrived.
 */
let pendingRef: string | null = null
let pendingSubId: string | null = null

/**
 * Flush anything held in memory once consent lands. Registered once, at module
 * load, so it is active before any component calls into this file.
 */
if (typeof window !== 'undefined') {
  subscribeConsent(() => {
    if (!mayStoreNonEssential()) return
    if (pendingSubId) {
      setAffiliateSubId(pendingSubId)
      pendingSubId = null
    }
    if (pendingRef) {
      setAffiliateRef(pendingRef)
      pendingRef = null
    }
  })
}

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

  // 3. A ref seen this page load but not yet writable (consent gate unresolved
  //    or declined). Attribution for the visit in progress still works.
  if (pendingRef) return pendingRef

  // 4. Fall back to localStorage
  try {
    return localStorage.getItem(AFFILIATE_COOKIE_NAME)
  } catch {
    return null
  }
}

/**
 * Get affiliate sub-id from storage
 */
export function getAffiliateSubId(): string | null {
  if (typeof window === 'undefined') return null
  if (pendingSubId) return pendingSubId
  try {
    return localStorage.getItem(AFFILIATE_SUBID_COOKIE_NAME)
  } catch {
    return null
  }
}

/**
 * Set affiliate sub-id. Held in memory until the consent gate allows a write.
 */
export function setAffiliateSubId(subId: string): void {
  if (typeof window === 'undefined') return
  if (!mayStoreNonEssential()) {
    pendingSubId = subId
    return
  }
  try {
    localStorage.setItem(AFFILIATE_SUBID_COOKIE_NAME, subId)
  } catch {
    /* storage unavailable — attribution is best-effort, never fatal */
  }
}

/**
 * True when this page load saw a referral we are not yet allowed to persist.
 * Drives whether the consent prompt is worth showing at all — no referral means
 * nothing gated is pending, so there is nothing to ask about.
 */
export function hasPendingReferral(): boolean {
  return pendingRef !== null || pendingSubId !== null
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

  // Marketing attribution is consent-gated. Until the gate says yes, keep the
  // code in memory only: the current visit can still be attributed at checkout,
  // but nothing is written to the device.
  if (!mayStoreNonEssential()) {
    pendingRef = affiliateCode
    return
  }

  // Set Cookie
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + AFFILIATE_COOKIE_EXPIRY_DAYS)
  document.cookie = `${AFFILIATE_COOKIE_NAME}=${encodeURIComponent(affiliateCode)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`

  // Set LocalStorage (Redundancy)
  try {
    localStorage.setItem(AFFILIATE_COOKIE_NAME, affiliateCode)
    localStorage.setItem(`${AFFILIATE_COOKIE_NAME}_timestamp`, new Date().toISOString())
  } catch {
    /* cookie above is the primary; the mirror is best-effort */
  }
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

  // Drop the in-memory copy too, or a "clear" would leave the ref live for the
  // rest of the page and re-persist it the moment consent lands.
  pendingRef = null
  pendingSubId = null

  // Clear Cookie
  document.cookie = `${AFFILIATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`

  // Clear LocalStorage
  try {
    localStorage.removeItem(AFFILIATE_COOKIE_NAME)
    localStorage.removeItem(`${AFFILIATE_COOKIE_NAME}_timestamp`)
  } catch {
    /* ignore */
  }
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


