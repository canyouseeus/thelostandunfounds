# Discord Verification Debugging Guide

## Current Issue

Discord cannot verify the interactions endpoint URL. The signature verification is failing.

## Possible Causes

1. **Body Reconstruction Mismatch**: Vercel parses JSON automatically, and when we reconstruct with `JSON.stringify()`, it might not match exactly what Discord sent
2. **Public Key Issue**: The `DISCORD_PUBLIC_KEY` environment variable might be incorrect
3. **Signature Format**: The signature or timestamp headers might not be read correctly
4. **Raw Body Not Available**: Vercel might not provide raw body even with `bodyParser: false`

## Debugging Steps

### 1. Check Vercel Function Logs

After Discord tries to verify, check Vercel function logs for:
- The error message with body preview
- Whether `rawBody` is available
- The actual body format received

### 2. Verify Environment Variables

Make sure in Vercel:
- `DISCORD_PUBLIC_KEY` is set correctly
- The public key matches the one in Discord Developer Portal

### 3. Test Signature Verification

The endpoint now logs detailed information when verification fails:
- Signature preview
- Timestamp
- Body length and preview
- Whether raw body is available

### 4. Check Discord Developer Portal

- Verify the public key in General Information matches your env var
- Make sure you're using the correct application

## Next Steps

1. **Wait for deployment** (2-3 minutes)
2. **Try verification again** in Discord Developer Portal
3. **Check Vercel logs** immediately after to see the detailed error
4. **Compare** the logged body preview with what Discord actually sends

## Alternative Solutions

If signature verification continues to fail:

1. **Use a proxy/wrapper**: Route through a service that preserves raw body
2. **Accept reconstructed body**: Ensure `JSON.stringify()` produces consistent output
3. **Check Discord docs**: See if there's a way to handle this in Vercel

## Important Notes

- Discord **requires** signature verification to work
- We cannot skip verification for security reasons
- The endpoint must respond with `{"type": 1}` only if signature is valid
