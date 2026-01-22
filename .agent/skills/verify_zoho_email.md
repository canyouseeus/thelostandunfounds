---
name: verify-zoho-email-setup
description: Verify and fix Zoho Mail integration issues, specifically focusing on PATTERN_NOT_MATCHED errors and account ID configuration.
---

# Verify and Fix Zoho Mail Integration

This skill helps identify and resolve common issues with Zoho Mail integration, particularly the "PATTERN_NOT_MATCHED" error which is often caused by missing or incorrect Account IDs.

## Common Symptoms

- API returns `400 Bad Request` with `PATTERN_NOT_MATCHED` code
- Error message mentions `zoho-inputstream Input does not match the given pattern`
- Logs show fallback logic using email prefix (e.g., `admin` instead of numeric ID)

## Checklist

### 1. Verify Environment Variables

Check `.env.local` and `.env` for the following required variables:

```bash
ZOHO_CLIENT_ID="<your-client-id>"
ZOHO_CLIENT_SECRET="<your-client-secret>"
ZOHO_REFRESH_TOKEN="<your-refresh-token>"
ZOHO_FROM_EMAIL="<your-sender-email>"
# CRITICAL: This variable is often missing but required for reliable sending
ZOHO_ACCOUNT_ID="<your-numeric-account-id>"
```

**Note:** `ZOHO_ACCOUNT_ID` usually looks like `2933450000000008002` (a long numeric string).

### 2. Verify Code Implementation

Ensure any email sending service (e.g., in `/api` handlers) supports the `ZOHO_ACCOUNT_ID` override. The code should look similar to this:

```typescript
async function getZohoAccountInfo(accessToken: string, fallbackEmail: string) {
    // 1. Check for explicit env var first
    const explicitAccountId = process.env.ZOHO_ACCOUNT_ID;
    if (explicitAccountId) {
        return { accountId: explicitAccountId, email: fallbackEmail };
    }

    // 2. Otherwise try to fetch from API
    // ... fetch implementation ...
}
```

### 3. How to Find Your Zoho Account ID

If `ZOHO_ACCOUNT_ID` is missing, you can find it by:

1. **Checking Logs:** Look for successful successful calls in other parts of the app (e.g. `[Zoho] Found account ID: ...`)
2. **API Query:** The `getZohoAccountInfo` function attempts to fetch it from `https://mail.zoho.com/api/accounts`. Add logging to view the response.
3. **Zoho Console:** It is sometimes available in the Zoho Mail developer console URL or settings.

## Debugging Workflow

1. **Check Logs:** Search for "Zoho email API error" or "PATTERN_NOT_MATCHED".
2. **Check Fallback:** If logs show `Found account ID: admin` (or similar non-numeric string), the fallback logic is failing.
3. **Add Env Var:** Add `ZOHO_ACCOUNT_ID` to `.env.local`.
4. **Restart Server:** Environment variables in `.env.local` require a server restart to take effect.
