/**
 * Auth headers for admin API calls.
 *
 * Admin endpoints previously accepted an `X-Admin-Email` header as proof of
 * identity, and the frontend duly shipped the owner's address in browser code.
 * Since a header is trivially forged, that header was never a credential — it
 * was a public string that happened to unlock admin endpoints.
 *
 * Admin endpoints now require a verified Supabase session, so callers send the
 * access token instead. Use this helper for every admin request.
 */
import { supabase } from '../lib/supabase'

/**
 * Build headers carrying the current session's bearer token.
 *
 * Returns without an Authorization header when there is no session; the server
 * then answers 401, which is the correct outcome for a signed-out caller.
 */
export async function adminHeaders(
    extra?: Record<string, string>
): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return {
        ...(extra || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

/** Convenience for the common JSON case. */
export async function adminJsonHeaders(
    extra?: Record<string, string>
): Promise<Record<string, string>> {
    return adminHeaders({ 'Content-Type': 'application/json', ...(extra || {}) })
}

/**
 * fetch() with the admin bearer token attached.
 *
 * Returns a promise, so existing `.then()` call sites keep working without
 * having to become async purely to await a header.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = await adminHeaders(init.headers as Record<string, string> | undefined)
    return fetch(input, { ...init, headers })
}
