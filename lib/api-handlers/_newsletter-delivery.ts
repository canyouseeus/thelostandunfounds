/**
 * Newsletter delivery: one recipient at a time, Resend first, Zoho second,
 * and "hold" when neither has room so the recipient is sent later instead of
 * failing.
 *
 * Order for each recipient:
 *   1. Resend, while today's quota leaves RESEND_TRANSACTIONAL_RESERVE emails
 *      for receipts, sign-ups and alerts. A 429 rate limit is retried once.
 *   2. Zoho, when Resend is out of room or refused the send for any reason,
 *      up to ZOHO_HOURLY_SEND_CAP sends in a rolling hour and spaced 2.1s
 *      apart for Zoho's 30-calls-a-minute API limit.
 *   3. Held, when neither provider has room. The caller logs the recipient as
 *      'pending' and reschedules the campaign for resumeAt().
 *
 * A recipient is only "failed" when a provider actually tried and refused it
 * for a reason that isn't a limit (a bad address, an outage).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type EmailProvider,
  ZOHO_MIN_INTERVAL_MS,
  closeZohoForAnHour,
  isZohoLimitError,
  nextUtcMidnight,
  noteZohoSent,
  resendHasRoom,
  resendTransactionalReserve,
  sendViaResend,
  zohoHourlySendCap,
  zohoIsClosed,
  zohoReopensAt,
  zohoSentLastHourHere,
} from './_email-quota.js'
import { delay, getZohoAuthContext, sendZohoEmail, type ZohoAuthContext } from './_zoho-email-utils.js'

export type DeliveryOutcome =
  | { status: 'sent'; provider: EmailProvider }
  | { status: 'failed'; provider?: EmailProvider; error: string }
  | { status: 'held'; reason: string }

export interface NewsletterSender {
  send(to: string, subject: string, html: string): Promise<DeliveryOutcome>
  /** When a held recipient can next be tried. */
  resumeAt(): Date
  /** Why recipients are being held, for the log and the admin. */
  holdReason(): string
  readonly sentBy: { resend: number; zoho: number }
}

const HOUR_MS = 60 * 60 * 1000
const RESEND_MIN_INTERVAL_MS = 250 // Resend allows 10/s per team; stay well under.

/**
 * Zoho sends logged for newsletters in the last rolling hour, or null when the
 * provider column isn't there yet (migration not applied).
 */
export async function countRecentZohoNewsletterSends(supabase: SupabaseClient): Promise<number | null> {
  const since = new Date(Date.now() - HOUR_MS).toISOString()
  const { count, error } = await supabase
    .from('newsletter_send_logs')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'zoho')
    .gte('sent_at', since)
  if (error) return null
  return count ?? 0
}

export async function createNewsletterSender(
  supabase: SupabaseClient,
  opts: { allowResend?: boolean; allowZoho?: boolean } = {}
): Promise<NewsletterSender> {
  const reserve = resendTransactionalReserve()
  const zohoCap = zohoHourlySendCap()

  let resendOpen = opts.allowResend !== false && !!process.env.RESEND_API_KEY
  let resendClosedForQuota = false
  let lastResendAt = 0

  const dbZoho = opts.allowZoho === false ? 0 : await countRecentZohoNewsletterSends(supabase)
  let zohoUsed = Math.max(dbZoho ?? 0, zohoSentLastHourHere())
  let zohoOpen = opts.allowZoho !== false
  let zohoUnavailable = false
  let zohoLimitHit = false
  let zohoAuth: ZohoAuthContext | null = null
  let lastZohoAt = 0

  const sentBy = { resend: 0, zoho: 0 }

  const paceResend = async () => {
    const wait = lastResendAt + RESEND_MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await delay(wait)
    lastResendAt = Date.now()
  }

  const paceZoho = async () => {
    const wait = lastZohoAt + ZOHO_MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await delay(wait)
    lastZohoAt = Date.now()
  }

  const zohoReady = async (): Promise<boolean> => {
    if (!zohoOpen) return false
    if (zohoIsClosed()) {
      zohoOpen = false
      zohoLimitHit = true
      return false
    }
    if (zohoUsed >= zohoCap) {
      zohoOpen = false
      return false
    }
    if (!zohoAuth) {
      try {
        zohoAuth = await getZohoAuthContext()
      } catch (err: any) {
        console.warn('[newsletter-delivery] Zoho unavailable:', err?.message)
        zohoUnavailable = true
        zohoOpen = false
        return false
      }
    }
    return true
  }

  const holdReason = () => {
    const resendPart = resendClosedForQuota
      ? "Resend's daily limit is used up (the last few are kept for site emails)"
      : process.env.RESEND_API_KEY && opts.allowResend !== false
        ? 'Resend could not take it'
        : 'Resend is not configured'
    const zohoPart = zohoUnavailable
      ? 'Zoho could not sign in'
      : zohoLimitHit
        ? 'Zoho reported its sending limit'
        : `Zoho reached the ${zohoCap}-an-hour newsletter cap`
    return `Held: ${resendPart} and ${zohoPart}`
  }

  const resumeAt = () => {
    const now = Date.now()
    const resendBack = resendOpen ? now : nextUtcMidnight(now)
    const zohoBack = zohoUnavailable || opts.allowZoho === false
      ? Infinity
      : zohoLimitHit
        ? Math.max(zohoReopensAt(), now + HOUR_MS)
        : zohoOpen
          ? now
          : now + HOUR_MS + 5 * 60 * 1000
    return new Date(Math.min(resendBack, zohoBack))
  }

  const send = async (to: string, subject: string, html: string): Promise<DeliveryOutcome> => {
    let resendError: string | undefined

    if (resendOpen) {
      if (!(await resendHasRoom(1, reserve))) {
        resendOpen = false
        resendClosedForQuota = true
      } else {
        await paceResend()
        let r = await sendViaResend({ to, subject, html })
        if (!r.success && r.rateLimited) {
          await delay(Math.min(r.retryAfterMs ?? 1000, 5000))
          r = await sendViaResend({ to, subject, html })
        }
        if (r.success) {
          sentBy.resend++
          return { status: 'sent', provider: 'resend' }
        }
        if (r.quotaExceeded) {
          resendOpen = false
          resendClosedForQuota = true
        } else {
          resendError = r.error || 'Resend refused the send'
          console.warn(`[newsletter-delivery] Resend refused ${to}, trying Zoho: ${resendError}`)
        }
      }
    }

    if (!(await zohoReady())) {
      return resendError
        ? { status: 'failed', provider: 'resend', error: resendError }
        : { status: 'held', reason: holdReason() }
    }

    await paceZoho()
    const z = await sendZohoEmail({ auth: zohoAuth!, to, subject, htmlContent: html })
    if (z.success) {
      zohoUsed++
      noteZohoSent()
      sentBy.zoho++
      return { status: 'sent', provider: 'zoho' }
    }

    if (isZohoLimitError(z.error)) {
      closeZohoForAnHour()
      zohoOpen = false
      zohoLimitHit = true
      return resendError
        ? { status: 'failed', provider: 'resend', error: resendError }
        : { status: 'held', reason: holdReason() }
    }

    return {
      status: 'failed',
      provider: 'zoho',
      error: resendError ? `Resend: ${resendError}; Zoho: ${z.error}` : `Zoho: ${z.error}`,
    }
  }

  return { send, resumeAt, holdReason, sentBy }
}
