# Google Drive OAuth Setup Guide

This guide explains how to set up Google Drive OAuth2 authentication for the application.

## Overview

The application now supports Google Drive OAuth2 authentication for accessing Google Drive APIs. When users authorize the application, they can upload files to their Google Drive.

## Setup Steps

### 1. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Slides API

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** as the application type
4. Configure authorized redirect URIs:
   - `http://localhost:3000/oauth2callback` (for local development)
   - `http://localhost:5173/oauth2callback` (for Vite dev server)
   - `https://yourdomain.com/oauth2callback` (for production)
5. Save the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# For frontend (Vite)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note:** 
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used by the API endpoints (server-side)
- `VITE_GOOGLE_CLIENT_ID` is used by the frontend to initiate the OAuth flow
- `GOOGLE_REDIRECT_URI` should match one of your authorized redirect URIs

### 4. For Vercel Deployment

Add these environment variables in your Vercel project settings:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (set to your production URL)
- `VITE_GOOGLE_CLIENT_ID`

## How It Works

### OAuth Flow

1. **User initiates OAuth**: User clicks "Connect Google Drive" button
2. **Redirect to Google**: User is redirected to Google's authorization page
3. **User authorizes**: User grants permissions to the application
4. **Callback**: Google redirects to `/oauth2callback` with an authorization code
5. **Token exchange**: The API endpoint exchanges the code for access and refresh tokens
6. **Token storage**: Tokens are stored securely in sessionStorage
7. **Redirect**: User is redirected back to the application

### API Endpoints

#### POST `/api/google-drive/oauth2callback`
Exchanges an authorization code for access and refresh tokens.

**Request Body:**
```json
{
  "code": "authorization_code_from_google",
  "scope": "optional_scope_string"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "ya29.a0...",
  "refresh_token": "1//0...",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/drive ...",
  "token_type": "Bearer"
}
```

#### POST `/api/google-drive/refresh-token`
Refreshes an expired access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "refresh_token_string"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "ya29.a0...",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/drive ...",
  "token_type": "Bearer"
}
```

### Frontend Service

The `GoogleDriveService` (`src/services/google-drive.ts`) provides methods to:
- Store and retrieve tokens
- Check authentication status
- Refresh expired tokens
- Initiate OAuth flow

**Example Usage:**
```typescript
import { googleDriveService } from '../services/google-drive';

// Check if authenticated
if (googleDriveService.isAuthenticated()) {
  const token = googleDriveService.getAccessToken();
  // Use token for API calls
}

// Initiate OAuth flow
googleDriveService.initiateOAuthFlow();
```

## Security Considerations

1. **Token Storage**: Tokens are stored in `sessionStorage` which is cleared when the browser tab closes. For production, consider storing tokens server-side and using session-based authentication.

2. **HTTPS**: Always use HTTPS in production to protect tokens during transmission.

3. **Client Secret**: Never expose the client secret in frontend code. It should only be used in server-side API endpoints.

4. **Token Expiration**: Access tokens expire after 1 hour. The service automatically handles token refresh using the refresh token.

5. **Scope Limitation**: Request only the minimum scopes needed for your application.

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Ensure the redirect URI in your code matches exactly with the one configured in Google Cloud Console
- Check that you're using the correct protocol (http vs https) and port

### Error: "invalid_client"
- Verify that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure environment variables are properly loaded

### Error: "access_denied"
- User may have denied the authorization request
- Check OAuth consent screen configuration in Google Cloud Console

### Tokens Not Persisting
- Check browser console for errors
- Verify sessionStorage is available (not in incognito mode with restrictions)
- Ensure tokens are being stored after successful callback

## Testing

1. Start your development server: `npm run dev`
2. Navigate to a page that uses Google Drive (e.g., `/tools/tiktok-downloader`)
3. Click "Connect Google Drive"
4. Complete the OAuth flow
5. Verify tokens are stored and you can make API calls

## Next Steps

After setting up OAuth, you can:
- Upload files to Google Drive
- Create folders in Google Drive
- List files in Google Drive
- Integrate with Google Docs, Sheets, and Slides APIs

See the Google Drive API documentation for more details: https://developers.google.com/drive/api
