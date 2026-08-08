/**
 * Shared admin authorization for API handlers.
 *
 * WHY THIS EXISTS
 * ---------------
 * Many handlers previously authorized on a client-supplied `X-Admin-Email`
 * header alone:
 *
 *     const email = (req.headers['x-admin-email'] as string || '').toLowerCase()
 *     if (ADMIN_EMAILS.includes(email)) return true
 *
 * The header value was the entire credential — no token, no signature, no
 * session. Anyone could send `X-Admin-Email: admin@<domain>` and be treated as
 * the owner, and that address is published in the site's own structured data
 * and mailto: links. Several of those handlers then act through the
 * service-role client, which bypasses RLS.
 *
 * This module replaces that with verification of a real Supabase access token,
 * matching the pattern already used by the gallery and tags handlers.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createServiceSupabaseClient } from './_supabase-admin-client.js'

/**
 * Addresses permitted to act as admin. Kept as the single definition so adding
 * or removing an operator is a one-line change rather than a grep across
 * twenty handlers.
 */
export const ADMIN_EMAILS = [
    'thelostandunfounds@gmail.com',
    'admin@thelostandunfounds.com',
]

export function isAdminEmail(email: string | null | undefined): boolean {
    return ADMIN_EMAILS.includes((email || '').toLowerCase().trim())
}

/** Pull the bearer token out of the Authorization header. */
function bearerToken(req: VercelRequest): string | null {
    const raw = req.headers.authorization
    if (!raw) return null
    const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
    return m ? m[1].trim() : null
}

/**
 * Verify the caller holds a valid Supabase session for an admin account.
 * Returns the user on success, or null. Never trusts a header value as
 * identity — the token is validated against Supabase.
 */
export async function getAdminUser(req: VercelRequest) {
    const token = bearerToken(req)
    if (!token) return null
    try {
        const supabase = createServiceSupabaseClient()
        const { data, error } = await supabase.auth.getUser(token)
        if (error || !data?.user) return null
        return isAdminEmail(data.user.email) ? data.user : null
    } catch {
        return null
    }
}

/**
 * Guard for handlers. Responds 401 and returns null when the caller is not a
 * verified admin, so a handler can simply:
 *
 *     const user = await requireAdmin(req, res)
 *     if (!user) return
 */
export async function requireAdmin(req: VercelRequest, res: VercelResponse) {
    const user = await getAdminUser(req)
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return null
    }
    return user
}

/**
 * CORS headers for admin endpoints.
 *
 * These endpoints previously sent `Access-Control-Allow-Origin: *` while
 * treating a header as the credential, so any origin could drive them. Now
 * that authorization requires a bearer token the wildcard is less dangerous,
 * but there is still no reason for arbitrary origins to call admin endpoints.
 */
export function setAdminCors(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ADMIN_CORS_ORIGIN || 'https://www.thelostandunfounds.com')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Vary', 'Origin')
}
