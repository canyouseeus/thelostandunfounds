# JSON Parsing Error Fix

## Problem
The error "Unexpected token '<', "<!doctype "... is not valid JSON" occurs when code tries to parse HTML (like a 404 page) as JSON.

## Solution Applied

### 1. Created Missing API Handlers
- ✅ Created `lib/api-handlers/affiliates/dashboard.ts` - Returns affiliate dashboard data
- ✅ Created `lib/api-handlers/affiliates/payout-settings.ts` - Handles payout settings GET/POST
- ✅ Updated `api/affiliates/[action].ts` to register new handlers

### 2. Added Safe JSON Parsing Utility
Added `safeJsonParse()` function to `src/utils/helpers.ts` that:
- Checks content-type header before parsing
- Provides helpful error messages when HTML is returned
- Handles JSON parsing errors gracefully

## How to Fix AffiliateDashboard.tsx

Update all `.json()` calls to use `safeJsonParse()`:

### Before:
```typescript
const result = await response.json()
```

### After:
```typescript
import { safeJsonParse } from '../utils/helpers';

const result = await safeJsonParse(response)
```

### Example Fix for loadDashboard function:

```typescript
import { safeJsonParse } from '../utils/helpers';

const loadDashboard = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/affiliates/dashboard?affiliate_code=${affiliateCode}`);
    
    if (!response.ok) {
      const errorData = await safeJsonParse(response).catch(() => ({ error: `HTTP ${response.status}` }));
      setError(errorData.error || 'Failed to load dashboard');
      setData(null);
      return;
    }

    const result = await safeJsonParse(response);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      // Also fetch MLM dashboard data
      if (result.affiliate?.id) {
        const mlmResponse = await fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${result.affiliate.id}`);
        if (mlmResponse.ok) {
          const mlmResult = await safeJsonParse(mlmResponse);
          setData({
            ...result,
            affiliate: {
              ...result.affiliate,
              ...mlmResult.affiliate,
            },
            network: mlmResult.network,
            earnings: mlmResult.earnings,
            discount_code: mlmResult.discount_code,
          });
        } else {
          setData(result);
        }
      } else {
        setData(result);
      }
    }
  } catch (error: any) {
    console.error('Error loading dashboard:', error);
    setError(error.message || 'Failed to load dashboard');
    setData(null);
  } finally {
    setLoading(false);
  }
};
```

### Apply Same Pattern to:
1. `loadPayoutSettings()` - Line ~182
2. `updatePayoutSettings()` - Line ~202
3. `updateAffiliateCode()` - Line ~270
4. Any other `.json()` calls in the component

## Testing

After applying the fix:
1. Navigate to the affiliate dashboard
2. Check browser console - should see no JSON parsing errors
3. Verify all API calls return JSON (not HTML)
4. Check network tab - all responses should have `content-type: application/json`

## Prevention

Always use `safeJsonParse()` instead of `.json()` when:
- Parsing fetch responses
- Handling API responses
- Working with external APIs that might return HTML error pages

