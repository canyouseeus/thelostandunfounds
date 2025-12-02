/**
 * Affiliate tracking utilities for customer referrals
 * Manages cookies and localStorage for lifetime affiliate ties
 */

const AFFILIATE_REF_COOKIE = 'affiliate_ref';
const COOKIE_EXPIRY_DAYS = 365; // 1 year

/**
 * Set affiliate referral code in cookie
 */
export function setAffiliateRef(affiliateCode: string): void {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
  
  document.cookie = `${AFFILIATE_REF_COOKIE}=${affiliateCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  
  // Also set in localStorage as backup
  localStorage.setItem(AFFILIATE_REF_COOKIE, affiliateCode);
  localStorage.setItem(`${AFFILIATE_REF_COOKIE}_timestamp`, new Date().toISOString());
}

/**
 * Get affiliate referral code from cookie or localStorage
 */
export function getAffiliateRef(): string | null {
  // Try cookie first
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === AFFILIATE_REF_COOKIE) {
      return value;
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem(AFFILIATE_REF_COOKIE);
}

/**
 * Clear affiliate referral (only use when user explicitly removes it)
 */
export function clearAffiliateRef(): void {
  // Clear cookie
  document.cookie = `${AFFILIATE_REF_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  
  // Clear localStorage
  localStorage.removeItem(AFFILIATE_REF_COOKIE);
  localStorage.removeItem(`${AFFILIATE_REF_COOKIE}_timestamp`);
}

/**
 * Check if affiliate ref exists
 */
export function hasAffiliateRef(): boolean {
  return getAffiliateRef() !== null;
}

/**
 * Get affiliate ref timestamp
 */
export function getAffiliateRefTimestamp(): string | null {
  return localStorage.getItem(`${AFFILIATE_REF_COOKIE}_timestamp`);
}

/**
 * Track customer to affiliate (call API)
 */
export async function trackCustomerToAffiliate(
  email: string,
  userId?: string,
  affiliateCode?: string
): Promise<any> {
  const code = affiliateCode || getAffiliateRef();
  
  if (!code) {
    return { success: false, error: 'No affiliate code' };
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
    });

    return await response.json();
  } catch (error) {
    console.error('Error tracking customer:', error);
    return { success: false, error: 'Failed to track customer' };
  }
}

/**
 * Check if customer is already tied to an affiliate
 */
export async function checkCustomerAffiliate(email: string): Promise<any> {
  try {
    const response = await fetch(`/api/affiliates/check-customer?email=${encodeURIComponent(email)}`);
    return await response.json();
  } catch (error) {
    console.error('Error checking customer:', error);
    return { found: false };
  }
}

/**
 * Initialize affiliate tracking from URL
 * Call this on page load to capture ?ref= parameter
 */
export function initAffiliateTracking(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    setAffiliateRef(refCode);
    console.log('Affiliate ref captured:', refCode);
    
    // Optionally remove ref from URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());
  }
}



