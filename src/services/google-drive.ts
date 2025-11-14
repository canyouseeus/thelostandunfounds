/**
 * Google Drive Service
 * Manages Google Drive OAuth tokens and API interactions
 */

interface GoogleDriveTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
  token_type?: string;
}

const STORAGE_KEY = 'google_drive_tokens';

export class GoogleDriveService {
  /**
   * Store Google Drive tokens
   */
  storeTokens(tokens: GoogleDriveTokens): void {
    try {
      // Calculate expiration timestamp
      const expiresAt = tokens.expires_in 
        ? Date.now() + (tokens.expires_in * 1000)
        : tokens.expires_at;
      
      const tokensWithExpiry = {
        ...tokens,
        expires_at: expiresAt,
      };

      // Store in sessionStorage (more secure than localStorage)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokensWithExpiry));
    } catch (error) {
      console.error('Failed to store Google Drive tokens:', error);
    }
  }

  /**
   * Get stored Google Drive tokens
   */
  getTokens(): GoogleDriveTokens | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const tokens: GoogleDriveTokens = JSON.parse(stored);
      
      // Check if token is expired
      if (tokens.expires_at && tokens.expires_at < Date.now()) {
        // Token expired, try to refresh if refresh token exists
        if (tokens.refresh_token) {
          // In a real implementation, you'd call the refresh endpoint here
          // For now, we'll just clear expired tokens
          this.clearTokens();
          return null;
        }
        this.clearTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Failed to retrieve Google Drive tokens:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with Google Drive
   */
  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && !!tokens.access_token;
  }

  /**
   * Get access token (returns null if expired or not available)
   */
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.access_token || null;
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear Google Drive tokens:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<GoogleDriveTokens | null> {
    try {
      const tokens = this.getTokens();
      if (!tokens?.refresh_token) {
        return null;
      }

      const response = await fetch('/api/google-drive/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const newTokens = await response.json();
      this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Failed to refresh Google Drive token:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Initiate Google Drive OAuth flow
   */
  initiateOAuthFlow(): void {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    // Use current origin to support both localhost:3000 and localhost:5173
    const redirectUri = `${window.location.origin}/oauth2callback`;
    
    if (!clientId) {
      throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    window.location.href = authUrl.toString();
  }
}

export const googleDriveService = new GoogleDriveService();
