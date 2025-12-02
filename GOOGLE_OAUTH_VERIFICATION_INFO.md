# Google OAuth App Verification - Additional Information

This document contains all the information needed for Google Cloud Console OAuth app verification.

## App Description

**THE LOST+UNFOUNDS** is a modern web platform that allows users to:
- Submit and publish blog articles about books and literature
- Create personalized blog subdomains (e.g., `username.thelostandunfounds.com`)
- Share book recommendations and affiliate links
- Subscribe to newsletters and book club updates
- Authenticate using Google OAuth for seamless sign-in

The platform uses Google OAuth **exclusively for user authentication** - to allow users to sign in with their Google account instead of creating a separate account. We only request basic profile information (email, name) to create user accounts on our platform.

**Live Website**: https://www.thelostandunfounds.com

## Test User Credentials

For testing Google OAuth authentication, you can use these admin accounts:

1. **Primary Admin Email**: `thelostandunfounds@gmail.com`
2. **Secondary Admin Email**: `admin@thelostandunfounds.com`

**Note**: These are real admin accounts on our platform. You can use either email to test the Google OAuth sign-in flow. Both accounts have admin privileges and can access the full application.

### How to Test

1. Go to: https://www.thelostandunfounds.com
2. Click "Sign In with Google"
3. Sign in with either `thelostandunfounds@gmail.com` or `admin@thelostandunfounds.com`
4. You should be redirected back to the app after successful authentication

## OAuth Configuration Details

### Google OAuth Client ID
```
817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt.apps.googleusercontent.com
```

### Authorized Redirect URIs

The app uses **Supabase** as the authentication backend, which handles the OAuth callback. The redirect URI is:

```
https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback
```

**Important**: This is the Supabase project's OAuth callback endpoint. Supabase then redirects users back to our application at:
- `https://www.thelostandunfounds.com/auth/callback`
- `https://thelostandunfounds.com/auth/callback`

### Supabase Project Information

- **Project Reference ID**: `nonaqhllakrckbtbawrb`
- **Project URL**: `https://nonaqhllakrckbtbawrb.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb

### OAuth Scopes Requested

### Main Application (User Authentication)
The main app requests these **non-sensitive scopes** for user authentication:
1. `openid` - For OpenID Connect authentication
2. `email` - To get user's email address for account creation
3. `profile` - To get user's name and profile picture

### TikTok Downloader Feature (Google Drive Integration)
The TikTok downloader feature (separate service on Railway) uses Google Drive API to upload downloaded videos. This feature:
- Runs on a separate backend: `https://tiktok-downloader-production-ab40.up.railway.app`
- Uses Google Drive API via MCP server integration

**Important**: We are **separating the OAuth clients** for better security and compliance:
- **This OAuth client** (`817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt`) is **ONLY for user authentication** (openid, email, profile)
- **Google Drive integration** will use a **separate OAuth client** (to be created later if needed)
- This separation ensures users only grant the minimum permissions needed for each feature

**Current Status**: The TikTok downloader Google Drive feature is currently disabled or uses a separate OAuth configuration. We are requesting verification for the authentication OAuth client only.

## Related Projects

### Supabase Project
- **Project ID**: `nonaqhllakrckbtbawrb`
- **Purpose**: Authentication backend and database
- **OAuth Integration**: Supabase handles the Google OAuth flow on our behalf

**Note**: We do not have any other Google Cloud projects that use this OAuth client. This is the only project using Google OAuth for authentication.

**Separation Strategy**: We are keeping OAuth clients separate:
- **This OAuth client**: User authentication only (openid, email, profile scopes)
- **Future OAuth client** (if needed): Google Drive API access for TikTok downloader feature
- This separation follows security best practices and minimizes user permissions

## Application URLs

### Production URLs
- **Main Site**: https://www.thelostandunfounds.com
- **Alternative Domain**: https://thelostandunfounds.com
- **OAuth Callback**: https://www.thelostandunfounds.com/auth/callback

### Development URLs (for testing)
- **Local Development**: http://localhost:5173
- **Local OAuth Callback**: http://localhost:5173/auth/callback

## Technical Implementation

### OAuth Flow
1. User clicks "Sign In with Google" on our website
2. User is redirected to Google OAuth consent screen
3. User grants permission for email/profile access
4. Google redirects to Supabase callback: `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback`
5. Supabase processes the OAuth response and creates/updates user session
6. Supabase redirects user back to our app: `https://www.thelostandunfounds.com/auth/callback`
7. Our app completes the sign-in process

### Code References
- OAuth implementation: `src/servers/auth/index.ts` (lines 59-80)
- Auth service: `src/services/auth.ts`
- Auth context: `src/contexts/AuthContext.tsx`
- Callback handler: `src/pages/AuthCallback.tsx`

## Privacy & Security

### Data Usage
- **Email**: Used to create user accounts and send notifications
- **Name**: Displayed on user profiles and blog posts
- **Profile Picture**: Displayed on user profiles (optional)

### Data Storage
- User data is stored in Supabase database (PostgreSQL)
- We do NOT store Google account passwords or access tokens
- We only store the email address and basic profile info provided by Google

### Security Measures
- All OAuth requests use HTTPS
- Supabase handles token management securely
- Row Level Security (RLS) policies protect user data
- No sensitive Google data is accessed or stored

## Support & Contact

If you need additional information for verification:

- **Website**: https://www.thelostandunfounds.com
- **Admin Email**: thelostandunfounds@gmail.com
- **Support Email**: support@thelostandunfounds.com

## Verification Checklist

For Google Cloud Console verification, please ensure:

- ✅ OAuth consent screen is published ("In production")
- ✅ Scopes `openid`, `email`, and `profile` are added (authentication only)
- ✅ **No Google Drive scopes** - Drive integration will use separate OAuth client
- ✅ Redirect URI `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback` is configured
- ✅ Test users can sign in successfully
- ✅ App description clearly explains OAuth usage
- ✅ Privacy policy URL is provided (if required)

## Additional Notes

- The app is **already in production** and actively used by real users
- Google OAuth has been working in testing mode with test users
- We are requesting verification to allow all users to sign in (not just test users)
- The main app uses Google OAuth **only for user authentication** (no Drive, Gmail, Calendar access)
- **TikTok Downloader Feature**: A separate service that uploads videos to Google Drive
  - Backend URL: `https://tiktok-downloader-production-ab40.up.railway.app`
  - **Will use a separate OAuth client** for Google Drive API access (to be configured later)
  - This OAuth client verification is **only for user authentication**, not Drive access
  - Separating OAuth clients ensures users only grant minimum required permissions

---

**Last Updated**: 2025-01-27
**App Status**: Production
**OAuth Status**: Testing Mode (requesting verification for production)
