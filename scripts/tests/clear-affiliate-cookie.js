// ============================================
// CLEAR AFFILIATE COOKIE SCRIPT
// ============================================
// Run this in your browser console to clear the affiliate cookie
// Then refresh the page with ?ref=TEST-AFFILIATE-1

// Clear the affiliate cookie
document.cookie = "affiliate_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";

// Verify it's cleared
const cookies = document.cookie.split(';');
const affiliateCookie = cookies.find(c => c.trim().startsWith('affiliate_ref='));
console.log('Affiliate cookie after clearing:', affiliateCookie || '✅ Cookie cleared!');

// Reload the page
console.log('🔄 Reloading page...');
window.location.reload();

