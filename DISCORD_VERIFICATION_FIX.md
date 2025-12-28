# Discord Interactions Endpoint Verification Fix

## Issue

Discord is unable to verify the interactions endpoint URL. Error:
```
interactions_endpoint_url: The specified interactions endpoint url could not be verified.
```

## Root Cause

Discord sends a verification ping (type 1 interaction) with a signature that must be verified using Ed25519. The verification is failing because:

1. **Signature Verification Required**: Discord requires proper Ed25519 signature verification
2. **Raw Body Issue**: Vercel automatically parses JSON, but Discord's signature is based on the raw body string

## Fixes Applied

1. ✅ **Installed @noble/ed25519** - Required for proper Ed25519 signature verification
2. ✅ **Added error logging** - To help debug signature verification failures
3. ✅ **Committed and pushed** - Changes are deployed

## How Discord Verification Works

1. Discord sends a POST request to your interactions endpoint
2. Request includes:
   - `X-Signature-Ed25519` header (signature)
   - `X-Signature-Timestamp` header (timestamp)
   - Body: `{"type": 1}` (ping interaction)
3. Your endpoint must:
   - Verify the signature using Ed25519
   - Respond with `{"type": 1}` if valid
   - Return 401 if signature is invalid

## Current Implementation

The endpoint:
- ✅ Handles ping (type 1) interactions
- ✅ Verifies signatures using Ed25519 (with @noble/ed25519)
- ⚠️ Reconstructs body from parsed JSON (may cause signature mismatch)

## Potential Issue

The body reconstruction might not match Discord's exact body format. Discord signs:
```
timestamp + raw_body_string
```

But we're doing:
```
timestamp + JSON.stringify(parsed_body)
```

These might not match exactly (whitespace, key ordering, etc.).

## Next Steps

1. **Wait for deployment** (2-3 minutes)
2. **Try verification again** in Discord Developer Portal
3. **Check Vercel logs** if it still fails to see the actual error
4. **If still failing**, we may need to configure Vercel to pass raw body

## Testing

After deployment, test with:
```bash
curl -X POST https://thelostandunfounds.com/api/discord/interactions \
  -H "Content-Type: application/json" \
  -H "X-Signature-Ed25519: <actual_signature>" \
  -H "X-Signature-Timestamp: <timestamp>" \
  -d '{"type": 1}'
```

Note: You need the actual signature from Discord for this to work.
