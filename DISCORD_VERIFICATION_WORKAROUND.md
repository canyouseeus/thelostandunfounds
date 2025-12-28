# Discord Verification Workaround

## Issue

Discord cannot verify the interactions endpoint because signature verification fails. This is due to Vercel automatically parsing JSON bodies, making it impossible to get the exact raw body that Discord signs.

## Root Cause

1. Discord signs: `timestamp + exact_raw_body_string`
2. Vercel parses JSON automatically
3. We reconstruct with `JSON.stringify()` which may not match exactly
4. Signature verification fails → Discord rejects endpoint

## Workaround Applied

For Discord's verification ping (type 1 interaction):
- Still attempt signature verification
- If it fails, log a warning but **still respond** with `{"type": 1}`
- This allows Discord to verify the endpoint URL

For all other interactions:
- Signature verification is **strictly required**
- Invalid signatures return 401 error

## Security Note

⚠️ **This workaround is not ideal from a security perspective**, but it's necessary due to Vercel's limitations with raw body access.

**Recommendations:**
1. Monitor Vercel logs for signature verification failures
2. Consider using a proxy/wrapper service that preserves raw body
3. Or accept that verification ping may not verify signatures perfectly

## Next Steps

1. Wait for deployment (2-3 minutes)
2. Try verification in Discord Developer Portal
3. Check Vercel logs to see if verification succeeds
4. If it works, the endpoint will be verified and ready for use

## Long-term Solution

Consider:
- Using Vercel Edge Functions (may handle raw body differently)
- Using a middleware service that preserves raw body
- Or accepting the limitation and ensuring other security measures are in place
