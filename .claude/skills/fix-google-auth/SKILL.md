---
name: fix-google-auth
description: Diagnose and resolve Google OAuth failures. Use when Google login fails, user gets sent to /?error=auth_failed, or OAuth returns server_error during sign-in.
---

# Fix Google Auth

## STEP 1: Check Supabase Auth Logs FIRST (before touching any code)

**Always do this before making any code changes.** The real error is always in the logs.

Use the Supabase MCP:
```
mcp__e1627760-fb4d-4619-8413-df82f44de129__get_logs
  project_id: nonaqhllakrckbtbawrb
  service: auth
```

Look for the actual error message. Common ones and their fixes:

### "invalid_client" / "The provided client secret is invalid"
**Root cause:** The Google OAuth client secret in Supabase is wrong or expired — NOT a code issue.

**Fix:**
1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the OAuth 2.0 Client ID → copy the current **Client Secret**
3. Go to [Supabase Dashboard → Auth → Providers → Google](https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/auth/providers)
4. Paste the secret → Save
5. Done. No code changes needed.

### "redirect_uri_mismatch"
**Root cause:** The Supabase callback URL isn't registered in Google Cloud Console.

**Fix:** In Google Cloud Console, add `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback` to the list of **Authorized redirect URIs** for the OAuth client.

### "invalid_grant" / code expired
**Root cause:** The OAuth code expired before Supabase could exchange it (usually >60s delay).

**Fix:** Usually transient — check if Supabase project is paused or having latency issues.

---

## STEP 2: Only if logs show a client-side issue

If the auth logs show the Google exchange is succeeding but the user is landing at the wrong page, the issue is in `src/pages/AuthCallback.tsx`. Check:

- `auth_return_url` in localStorage — is it set correctly before OAuth?
- `resolveReturnUrl()` — does it map the return URL to the right destination?
- PKCE race condition — only resolve the session promise when `s` is non-null (not on INITIAL_SESSION with null)

---

## What NOT to do

- Do NOT change `signInWithGoogle` queryParams (`access_type: 'offline'`, `prompt: 'consent'`) without proof they're causing the issue
- Do NOT change `signOut()` scope without proof
- Do NOT make blind code changes based on symptoms — check logs first, every time
