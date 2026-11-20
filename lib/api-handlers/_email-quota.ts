/**
 * Email provider budgets: keep the site inside Resend's daily quota and Zoho's
 * hourly sending cap, and tell callers when to move to the other provider.
 *
 * Resend (free plan, read from their docs 2026-11-12):
 *   - 100 emails per UTC calendar day, resetting at 00:00 UTC (6 PM CST).
 *   - Every to/cc/bcc address counts as one email.
 *   - Going over returns 429 with name `daily_quota_exceeded`, and Resend does
 *     NOT queue or retry the message. The caller has to.
 *   - GET /usage returns the authoritative count for the whole team, so sends
 *     made by any code path (crons, scripts) are included. Every send response
 *     also carries `x-resend-daily-quota` with the count used so far.
 *   - 10 requests per second per team.
 *
 * Zoho Mail (rates-and-limits page, read 2026-11-12):
 *   - 50 to 500 external emails per ROLLING hour, set by sender reputation.
 *     Over it, the mailbox cannot send for up to an hour. That mailbox is also
 *     the site's primary transactional sender and the owner's business mail,
 *     so tripping it is worse than holding a newsletter for an hour.
 *   - The Mail REST API allows 30 requests per minute.
 *   - Bulk sending is outside Zoho's business usage policy, so newsletter use
 *     of Zoho is capped well under the hourly floor (ZOHO_HOURLY_SEND_CAP).
 *
 * State here is per warm lambda. Resend's count comes from its own API, so it
 * is shared across lambdas. Zoho has no usage API: callers that send in bulk
 * should also count their own recent Zoho sends from the database.
 */

const RESEND_API = 'https://api.resend.com'

export type EmailProvider = 'resend' | 'zoho'

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** Daily cap to assume when Resend's usage API can't be read. */
export function resendDailyLimitFallback(): number {
  return envInt('RESEND_DAILY_LIMIT', 100)
}

/** Resend sends kept back from bulk mail for receipts, sign-ups and alerts. */
export function resendTransactionalReserve(): number {
  return envInt('RESEND_TRANSACTIONAL_RESERVE', 15)
}

/** Most Zoho sends a newsletter may use in any rolling hour. */
export function zohoHourlySendCap(): number {
  return envInt('ZOHO_HOURLY_SEND_CAP', 40)
}

/** Zoho's REST API allows 30 calls a minute; 2.1s apart stays under it. */
export const ZOHO_MIN_INTERVAL_MS = 2100

export function nextUtcMidnight(now = Date.now()): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
}

// ---------------------------------------------------------------- Resend

interface ResendUsage {
  used: number | null
  /** null with source 'api' means the team has no daily cap (paid plan). */
  limit: number | null
  resetsAt: number
  source: 'api' | 'header' | 'unknown'
  fetchedAt: number
}

let usage: ResendUsage | null = null
let resendClosedUntil = 0

/** For tests. */
export function __resetEmailQuotaState() {
  usage = null
  resendClosedUntil = 0
  zohoSendTimes.length = 0
  zohoClosedUntil = 0
}

function usageIsCurrent(u: ResendUsage | null, now: number): u is ResendUsage {
  return !!u && now < u.resetsAt
}

/**
 * Today's Resend usage. Reads GET /usage at most every `maxAgeMs`; between
 * reads the count is advanced locally from each send's quota header.
 */
export async function getResendDailyUsage(maxAgeMs = 30_000): Promise<ResendUsage> {
  const now = Date.now()
  if (usageIsCurrent(usage, now) && now - usage.fetchedAt < maxAgeMs) return usage

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(`${RESEND_API}/usage`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (res.ok) {
        const data: any = await res.json()
        const daily = data?.emails?.daily
        if (daily && typeof daily.used === 'number') {
          const resetsAt = daily.resets_at ? Date.parse(daily.resets_at) : nextUtcMidnight(now)
          usage = {
            used: daily.used,
            limit: typeof daily.limit === 'number' ? daily.limit : null,
            resetsAt: Number.isFinite(resetsAt) ? resetsAt : nextUtcMidnight(now),
            source: 'api',
            fetchedAt: now,
          }
          return usage
        }
      } else {
        // A sending-only key can't read usage. Fall through to header counts.
        console.warn(`[email-quota] Resend /usage returned ${res.status}; using send headers instead`)
      }
    } catch (err: any) {
      console.warn('[email-quota] Resend /usage failed:', err?.message)
    }
  }

  if (usageIsCurrent(usage, now)) return usage
  return {
    used: null,
    limit: resendDailyLimitFallback(),
    resetsAt: nextUtcMidnight(now),
    source: 'unknown',
    fetchedAt: now,
  }
}

function noteResendResponse(res: Response, recipients: number) {
  const now = Date.now()
  const header = res.headers.get('x-resend-daily-quota')
  const headerUsed = header !== null ? Number.parseInt(header, 10) : NaN
  if (Number.isFinite(headerUsed)) {
    const keepApiLimit = usageIsCurrent(usage, now) && usage.source === 'api'
    usage = {
      used: Math.max(headerUsed, usageIsCurrent(usage, now) && usage.used !== null ? usage.used : 0),
      limit: keepApiLimit ? usage!.limit : resendDailyLimitFallback(),
      resetsAt: usageIsCurrent(usage, now) ? usage.resetsAt : nextUtcMidnight(now),
      source: keepApiLimit ? 'api' : 'header',
      fetchedAt: usageIsCurrent(usage, now) ? usage.fetchedAt : 0,
    }
  } else if (res.ok && usageIsCurrent(usage, now) && usage.used !== null) {
    usage = { ...usage, used: usage.used + recipients }
  }
}

/** Mark Resend closed for the rest of the UTC day (after a quota refusal). */
export function closeResendForToday() {
  resendClosedUntil = nextUtcMidnight()
}

/**
 * Whether Resend can take `count` more emails while leaving `reserve` of the
 * day's quota untouched. Unknown usage answers yes: the send is tried and a
 * quota refusal closes Resend from then on.
 */
export async function resendHasRoom(count: number, reserve = 0): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false
  if (Date.now() < resendClosedUntil) return false
  const u = await getResendDailyUsage()
  if (u.source === 'api' && u.limit === null) return true
  if (u.used === null || u.limit === null) return true
  return u.used + count + reserve <= u.limit
}

export interface ResendSendParams {
  from?: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  headers?: Record<string, string>
}

export interface ResendSendResult {
  success: boolean
  id?: string
  error?: string
  status?: number
  /** Resend refused because the daily or monthly quota is used up. */
  quotaExceeded?: boolean
  /** Resend refused because of its per-second rate limit. */
  rateLimited?: boolean
  retryAfterMs?: number
}

function countRecipients(p: ResendSendParams): number {
  const n = (v?: string | string[]) => (v ? (Array.isArray(v) ? v.length : 1) : 0)
  return Math.max(1, n(p.to) + n(p.cc) + n(p.bcc))
}

/**
 * Send one email through Resend and keep the quota count current. Does not
 * check the budget first: call resendHasRoom when the caller has another way
 * to send.
 */
export async function sendViaResend(params: ResendSendParams): Promise<ResendSendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'Resend API key not configured' }

  const from =
    params.from || process.env.RESEND_FROM_EMAIL || 'THE LOST+UNFOUNDS <noreply@thelostandunfounds.com>'

  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(params.headers || {}),
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
      }),
    })

    noteResendResponse(res, countRecipients(params))

    let data: any = {}
    try {
      data = await res.json()
    } catch {
      data = {}
    }

    if (res.ok) return { success: true, id: data?.id, status: res.status }

    const name: string = data?.name || data?.error?.name || ''
    const message: string = data?.message || data?.error?.message || `Resend error: ${res.status}`
    const quotaExceeded = res.status === 429 && /quota/i.test(`${name} ${message}`)
    const rateLimited = res.status === 429 && !quotaExceeded
    if (quotaExceeded) {
      closeResendForToday()
      console.warn(`[email-quota] Resend quota reached (${name || res.status}); Resend closed until 00:00 UTC`)
    }
    const retryAfter = Number.parseFloat(res.headers.get('retry-after') || '')
    return {
      success: false,
      error: message,
      status: res.status,
      quotaExceeded,
      rateLimited,
      retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reach Resend' }
  }
}

// ------------------------------------------------------------------ Zoho

const zohoSendTimes: number[] = []
let zohoClosedUntil = 0

const HOUR_MS = 60 * 60 * 1000

/** Record a Zoho send made by this lambda. */
export function noteZohoSent(at = Date.now()) {
  zohoSendTimes.push(at)
  const cutoff = at - HOUR_MS
  while (zohoSendTimes.length && zohoSendTimes[0] < cutoff) zohoSendTimes.shift()
}

/** Zoho sends this lambda made in the last rolling hour. */
export function zohoSentLastHourHere(now = Date.now()): number {
  const cutoff = now - HOUR_MS
  return zohoSendTimes.filter(t => t >= cutoff).length
}

/** True when a Zoho error reads like its sending limit. */
export function isZohoLimitError(error?: string): boolean {
  return !!error && /(sending limit|quota|too many|rate limit|limit exceeded|\b429\b)/i.test(error)
}

/** Stop using Zoho for an hour after it reports a sending limit. */
export function closeZohoForAnHour() {
  zohoClosedUntil = Date.now() + HOUR_MS
}

export function zohoIsClosed(now = Date.now()): boolean {
  return now < zohoClosedUntil
}

export function zohoReopensAt(): number {
  return zohoClosedUntil
}
