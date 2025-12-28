# Testing Affiliate Click Tracking

## Current Status ✅

**Tracking is working!** The system successfully tracked clicks for `KING01`.

## What Happened

The affiliate tracking detected `KING01` from a cookie (set during a previous visit) instead of `TEST-AFFILIATE-1` from the URL. This is expected behavior - cookies persist across sessions.

## To Test with TEST-AFFILIATE-1

### Option 1: Clear Cookies (Recommended)
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Cookies** → `http://localhost:3000`
4. Delete the `affiliate_ref` cookie
5. Refresh the page with `?ref=TEST-AFFILIATE-1`

### Option 2: Use Incognito/Private Mode
1. Open an incognito/private window
2. Visit: `http://localhost:3000/shop?ref=TEST-AFFILIATE-1`
3. This ensures no existing cookies interfere

### Option 3: Clear Cookie via Console
Run this in browser console:
```javascript
document.cookie = "affiliate_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
location.reload();
```

## Verify Tracking

After clearing cookies and visiting with `?ref=TEST-AFFILIATE-1`:

1. **Check Console:**
   - Should see: `🔗 Affiliate ref detected: TEST-AFFILIATE-1`
   - Should see: `✅ Affiliate click tracked successfully: TEST-AFFILIATE-1`

2. **Check Database:**
   ```sql
   SELECT code, status, total_clicks 
   FROM affiliates 
   WHERE code = 'TEST-AFFILIATE-1';
   ```
   - `total_clicks` should increment

3. **Check Network Tab:**
   - Look for POST request to `/api/shop/affiliates/track-click`
   - Response should be: `{success: true}`

## Note About Double Tracking

You may see tracking called twice - this is normal in React development mode (StrictMode). In production, it will only be called once.

