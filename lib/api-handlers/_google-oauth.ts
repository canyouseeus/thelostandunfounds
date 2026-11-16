/**
 * The owner's Google Drive OAuth credentials — one place every Drive writer
 * gets them from.
 *
 * The refresh token used to live only in Vercel's GOOGLE_REFRESH_TOKEN. When
 * Google revokes or expires it (`invalid_grant`), every upload fails, and the
 * only way to mint a new one was a terminal script on a laptop. Now the owner
 * reconnects from Admin → Gallery → Google Drive (api/admin/google-oauth-check)
 * and the new token is stored in `google_oauth_credentials` (service role only).
 *
 * Order: the database row, then the Vercel variable. The client id and secret
 * still come from Vercel; only the refresh token rotates.
 */
import { createServiceSupabaseClient } from './_supabase-admin-client.js';

/** The redirect the Drive OAuth client already lists (scripts/setup-google-oauth.ts). */
export const GOOGLE_DRIVE_REDIRECT_URI = 'http://localhost:9999/oauth2callback';
export const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];
export const DRIVE_CREDENTIAL_KEY = 'drive';

export const DRIVE_RECONNECT_HINT =
    'Google Drive is disconnected. Reconnect it in Admin → Gallery → Google Drive.';

const CACHE_MS = 60_000;
let cached: { token: string | null; source: 'database' | 'env' | null; at: number } | null = null;

/** Forget the cached token, so the next call reads the one just saved. */
export function clearGoogleTokenCache() {
    cached = null;
}

export async function getGoogleRefreshToken(): Promise<{ token: string | null; source: 'database' | 'env' | null }> {
    if (cached && Date.now() - cached.at < CACHE_MS) return { token: cached.token, source: cached.source };
    let token: string | null = null;
    let source: 'database' | 'env' | null = null;
    try {
        const supabase = createServiceSupabaseClient();
        const { data } = await supabase
            .from('google_oauth_credentials')
            .select('refresh_token')
            .eq('key', DRIVE_CREDENTIAL_KEY)
            .maybeSingle();
        if (data?.refresh_token) { token = data.refresh_token; source = 'database'; }
    } catch (err: any) {
        // A database hiccup must not take Drive down while the Vercel token still works.
        console.warn('[google-oauth] could not read stored refresh token:', err?.message);
    }
    if (!token && process.env.GOOGLE_REFRESH_TOKEN) {
        token = process.env.GOOGLE_REFRESH_TOKEN;
        source = 'env';
    }
    cached = { token, source, at: Date.now() };
    return { token, source };
}

/** True when Google refused the refresh token itself — reconnecting fixes it. */
export function isInvalidGrant(err: any): boolean {
    const text = [err?.message, err?.response?.data?.error, err?.code].filter(Boolean).join(' ');
    return /invalid_grant/i.test(text);
}

/** An OAuth2 client holding the owner's refresh token, or null if anything is missing. */
export async function getGoogleOAuthClient(redirectUri?: string) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    const { token } = await getGoogleRefreshToken();
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !token) return null;
    const { google } = await import('googleapis');
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
    auth.setCredentials({ refresh_token: token });
    return auth;
}
