# Discord Interactions - Raw Body Fix

## Issue

Discord verification is still failing because we can't get the exact raw body that Discord signs. The signature verification requires the exact bytes that Discord sent.

## Problem

Vercel automatically parses JSON bodies, and when we reconstruct with `JSON.stringify()`, it may not match exactly (whitespace, key ordering, etc.), causing signature verification to fail.

## Solution Attempted

1. ✅ Installed `@noble/ed25519` for proper Ed25519 verification
2. ✅ Tried `bodyParser: false` in config (may not work in Vercel)
3. ✅ Updated handler to pass raw body from API route

## Current Implementation

The API route now:
- Attempts to get raw body from request
- Passes it to handler via `req.rawBody`
- Handler uses raw body if available, otherwise reconstructs

## Alternative Solutions

If this still doesn't work, we may need to:

1. **Use Vercel Edge Functions** - Edge functions might handle raw body differently
2. **Use a different approach** - Maybe accept that we need to reconstruct and ensure consistent JSON formatting
3. **Check Vercel logs** - See what body format we're actually receiving

## Testing

After deployment, check Vercel function logs to see:
- What format is `req.body`?
- Is `rawBody` being set?
- What error is signature verification showing?

## Next Steps

1. Deploy and test
2. Check Vercel logs for actual body format
3. If still failing, consider alternative approaches
