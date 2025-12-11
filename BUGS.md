# BUGS

## Fixed Bugs

### BUG-001: /qr route returned 404
**Status:** ✅ FIXED  
**Fixed in:** N/A  
**Date:** 2025-12-06  

**Description:**  
QR generator page existed but navigating to `/qr` returned a 404.

**Symptoms:**  
- Visiting `/qr` showed the not-found page.

**Root Cause:**  
- `QR` page component was never registered in the router.

**Solution:**  
- Added the `/qr` route to the main router so the QR generator renders correctly.

**Files Changed:**  
- `thelostandunfounds/src/App.tsx`

**Verification:**  
- Navigated to `/qr` and confirmed the QR generator page renders instead of 404.











