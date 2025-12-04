# Google OAuth Scopes for THE LOST AND UNFOUNDS

## Overview

Your app uses **Supabase** for Google OAuth authentication. When you use Supabase's Google OAuth provider, it automatically requests these standard authentication scopes.

## Required Scopes

Since your app uses Supabase's `signInWithOAuth` with the Google provider (see `src/servers/auth/index.ts`), you need to add these scopes to your Google Cloud Console OAuth consent screen:

### Non-Sensitive Scopes

1. **`openid`**
   - **User-facing description**: "See your basic profile info"
   - **Purpose**: Required for OpenID Connect authentication
   - **What it does**: Allows the app to verify your identity

2. **`email`**
   - **User-facing description**: "See your email address"
   - **Purpose**: Get the user's email address for account creation/login
   - **What it does**: Allows the app to access your email address

3. **`profile`**
   - **User-facing description**: "See your personal info, including any personal info you've made publicly available"
   - **Purpose**: Get basic profile information (name, profile picture)
   - **What it does**: Allows the app to access your name and profile picture

## How to Add These Scopes

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/apis/credentials/consent
   - Make sure you're in the **"THE LOST AND UNFOUNDS"** project

2. **Edit OAuth Consent Screen**
   - Click **"EDIT APP"** button
   - Scroll down to **"Scopes"** section
   - Click **"+ ADD OR REMOVE SCOPES"**

3. **Add the Required Scopes**
   - In the filter/search box, search for each scope:
     - Type `openid` and check the box
     - Type `email` and check the box  
     - Type `profile` and check the box
   - Click **"UPDATE"** to save

4. **Save and Continue**
   - Click **"SAVE AND CONTINUE"** through the remaining steps
   - **Publish your app** if it's still in testing mode (see `QUICK_FIX_403_ERROR.md`)

## Verification

After adding the scopes, you should see them listed in your OAuth consent screen:

- ✅ **Non-sensitive scopes**: `openid`, `email`, `profile`
- ✅ **Sensitive scopes**: (none)
- ✅ **Restricted scopes**: (none)

## Why These Scopes?

Your app only needs basic authentication information:
- **Email**: To create/login to user accounts
- **Profile**: To display user name and avatar (optional, but commonly requested)
- **OpenID**: Standard protocol for authentication

These are the **minimum required scopes** for user authentication. Your app does NOT request access to:
- Google Drive files (Drive integration uses a separate OAuth client)
- Gmail messages
- Calendar events
- Any other sensitive Google data

## OAuth Client Separation

**Important**: We are using **separate OAuth clients** for different features:
- **This OAuth client**: User authentication only (openid, email, profile)
- **Future OAuth client**: Google Drive API (for TikTok downloader, if needed)

This separation follows security best practices and ensures users only grant the minimum permissions needed for each feature.

## Code Reference

The OAuth implementation is in:
- `src/servers/auth/index.ts` (lines 59-80)
- Uses Supabase's `signInWithOAuth({ provider: 'google' })`
- Supabase automatically requests these standard scopes

## Next Steps

1. ✅ Add the 3 scopes listed above to your OAuth consent screen
2. ✅ Publish your app (if not already published)
3. ✅ Test Google Sign-In to verify it works

For more troubleshooting, see: `QUICK_FIX_403_ERROR.md`
