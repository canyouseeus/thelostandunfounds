# Google Drive Photos Integration Setup

This guide will help you set up Google Drive API integration to fetch and display photos from your Google Drive.

## Features

- ✅ OAuth 2.0 authentication with Google Drive
- ✅ Browse photos from your Google Drive
- ✅ Filter photos by folder
- ✅ View photos in a beautiful grid layout
- ✅ Click to view full-size images
- ✅ Pagination support for large photo collections

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in app name, user support email, developer contact
   - Add scopes: `https://www.googleapis.com/auth/drive.readonly`
   - Add test users (if app is not published)
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "THE LOST+UNFOUNDS Drive Photos"
   - Authorized redirect URIs:
     - `https://thelostandunfounds.com/api/drive/callback`
     - `http://localhost:3000/api/drive/callback` (for local development)
5. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add these to your Vercel environment variables (or `.env.local` for local development):

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://thelostandunfounds.com/api/drive/callback
```

**For Vercel:**
1. Go to your project settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments
3. Redeploy your application

### 4. Access the Photos Page

Once configured, visit:
- **Production**: `https://thelostandunfounds.com/photos`
- **Local**: `http://localhost:3000/photos`

## Usage

1. Click "Connect Google Drive" on the photos page
2. Authorize the application in the popup window
3. Your photos will load automatically
4. Use folder navigation to filter by specific folders
5. Click any photo to view it full-size

## API Endpoints

The integration includes these API endpoints:

- `GET /api/drive/auth` - Get OAuth authorization URL
- `GET /api/drive/callback` - OAuth callback handler
- `GET /api/drive/photos` - Fetch photos (requires access token)
- `GET /api/drive/folders` - List folders (requires access token)

## Security Notes

- Access tokens are stored in browser localStorage (consider server-side storage for production)
- The app requests read-only access (`drive.readonly` scope)
- Tokens expire and users will need to re-authenticate periodically
- Consider implementing token refresh for better UX

## Troubleshooting

### "Popup blocked" error
- Allow popups for your domain in browser settings

### "Access token expired" error
- Re-authenticate by clicking "Connect Google Drive" again

### No photos showing
- Check that you have photos in your Google Drive
- Verify the Google Drive API is enabled in your Google Cloud project
- Check browser console for API errors

### OAuth consent screen issues
- Make sure your app is published OR you've added your email as a test user
- Verify redirect URI matches exactly in Google Cloud Console

## Next Steps

Consider adding:
- Token refresh functionality
- Server-side token storage with user sessions
- Photo upload capability
- Photo search/filtering
- Album/collection support
