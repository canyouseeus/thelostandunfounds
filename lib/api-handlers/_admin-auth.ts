import type { VercelRequest } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

/**
 * The one admin check every admin route uses.
 *
 * Admin routes used to accept an `x-admin-email` header naming the owner. The
 * caller sets that header, and the owner's address is in the public JS bundle,
 * so anyone could send it and create invoices, payment links, commissions and
 * payouts, or send mail as media@. Several routes also compared
 * `x-admin-secret` to `process.env.ADMIN_SECRET` without checking either was
 * set — with the variable unset, a request carrying no header at all passed.
 *
 * A request is admin only if it proves it:
 *   1. `Authorization: Bearer <supabase access token>` whose verified user has
 *      a confirmed email on the admin list (the admin panel — see
 *      src/lib/api-auth.ts, which attaches the token to every /api call), or
 *   2. `x-admin-secret` matching a non-empty ADMIN_SECRET (agents, scripts), or
 *   3. a localhost request outside Vercel production/preview (local dev).
 *
 * `x-admin-email` is no longer evidence of anything and is ignored.
 */

export const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function secretMatches(provided: unknown): boolean {
  const expected = process.env.ADMIN_SECRET
  if (!expected || typeof provided !== 'string' || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function isLocalDev(req: VercelRequest): boolean {
  const env = process.env.VERCEL_ENV
  if (env === 'production' || env === 'preview') return false
  const host = req.headers.host || ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

/** The verified admin email behind a bearer token, or null. */
export async function verifiedAdminEmail(req: VercelRequest): Promise<string | null> {
  const authHeader = (req.headers.authorization as string) || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const { data, error } = await createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.getUser(token)
  if (error || !data.user) return null

  const email = data.user.email?.toLowerCase().trim()
  const confirmed = Boolean(data.user.email_confirmed_at || data.user.confirmed_at)
  return email && confirmed && ADMIN_EMAILS.includes(email) ? email : null
}

export async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  if (secretMatches(req.headers['x-admin-secret'])) return true
  if (isLocalDev(req)) return true
  return (await verifiedAdminEmail(req)) !== null
}
