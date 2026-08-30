import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js'
import { getMicrosite, resolveOrigin, safeRedirectPath } from '../../lib/api-handlers/_microsite-sites.js'

/**
 * Quote requests from the microsites.
 *
 * POST application/x-www-form-urlencoded, answered with a 303 back to the
 * microsite's thank-you page. That shape is the whole point: a plain HTML form
 * post is a CORS "simple request", so it crosses origins with no preflight and
 * no Access-Control-Allow-Origin header — which `vercel.json` does not set on
 * /api/* and should not start setting for this. The visitor never sees JSON,
 * and the form works with JavaScript disabled.
 *
 * Why not /api/booking: `bookings` has event_type text NOT NULL and event_date
 * date NOT NULL. A quote request has no date — the visitor is asking what a
 * shoot costs, not choosing a slot — so writing one there means inventing an
 * event_date, which puts a shoot nobody agreed to onto the calendar and past
 * the availability and travel-buffer guards in api/booking/index.ts. Leads get
 * their own table.
 *
 * Being public and cross-origin, this is a spam target, so it has three
 * independent guards: a honeypot field, a minimum fill time, and Turnstile.
 * The first two answer with a normal-looking success, because telling a bot
 * which check caught it is telling it how to pass next time.
 */

const NOTIFY_TO = 'admin@thelostandunfounds.com'
// The business address of record. CLAUDE.md: media-related outbound mail is
// CC'd, not BCC'd, so the thread stays on file.
const NOTIFY_CC = 'media@thelostandunfounds.com'

/** Trim, collapse whitespace, and cap length so one field can't carry an essay. */
function clean(value: unknown, max: number): string {
    if (typeof value !== 'string') return ''
    return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Same, but keeps newlines — the notes field is allowed to be a paragraph. */
function cleanMultiline(value: unknown, max: number): string {
    if (typeof value !== 'string') return ''
    return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim().slice(0, max)
}

function esc(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
    // Cloudflare's siteverify takes form encoding, not JSON.
    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)
    try {
        const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        })
        const data = (await r.json()) as { success?: boolean; 'error-codes'?: string[] }
        if (!data.success) {
            console.error('[microsite/lead] Turnstile rejected:', data['error-codes'])
        }
        return Boolean(data.success)
    } catch (err) {
        console.error('[microsite/lead] Turnstile verification threw:', err)
        return false
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = (req.body || {}) as Record<string, unknown>

    const site = getMicrosite(body.site)
    if (!site) {
        // An unknown site id means the post did not come from a site we run.
        // There is nowhere safe to redirect to, so answer plainly.
        return res.status(400).json({ error: 'Unknown site' })
    }

    const origin = resolveOrigin(site, (req.headers.origin as string) || null)
    const redirectPath = safeRedirectPath(body.redirect) ?? '/'
    const backTo = (suffix = '') => `${origin}${redirectPath}${suffix}`

    /** The answer a bot gets: exactly what a real submission gets. */
    const pretendSuccess = () => res.redirect(303, backTo())
    const rejectToForm = (code: string) => res.redirect(303, `${origin}/contact/?error=${code}`)

    // Guard 1 — honeypot. A field hidden from people and irresistible to a bot
    // that fills everything it finds.
    if (clean(body.website, 200).length > 0) {
        console.warn('[microsite/lead] honeypot filled, dropping submission')
        return pretendSuccess()
    }

    // Guard 2 — fill time. The form stamps when it rendered; a human cannot
    // read six fields and submit in under three seconds.
    const renderedAt = Number(body.t)
    if (Number.isFinite(renderedAt) && renderedAt > 0) {
        const elapsedMs = Date.now() - renderedAt
        if (elapsedMs >= 0 && elapsedMs < 3000) {
            console.warn(`[microsite/lead] submitted in ${elapsedMs}ms, dropping submission`)
            return pretendSuccess()
        }
    }

    const name = clean(body.name, 120)
    const email = clean(body.email, 200).toLowerCase()
    const phone = clean(body.phone, 40)
    const address = clean(body.address, 200)
    const bedrooms = clean(body.bedrooms, 60)
    const notes = cleanMultiline(body.notes, 4000)

    if (!name || !email || !address) return rejectToForm('missing')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return rejectToForm('email')

    // Guard 3 — Turnstile. Required whenever a secret is configured, so a bot
    // cannot get past it by simply omitting the token. Skipped only outside
    // production, where there is no widget to solve.
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
    if (isProduction && turnstileSecret) {
        const token = clean(body['cf-turnstile-response'], 4000)
        if (!token) return rejectToForm('captcha')
        const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || undefined
        const passed = await verifyTurnstile(token, turnstileSecret, ip)
        if (!passed) return rejectToForm('captcha')
    }

    const supabase = getSupabaseAdmin()

    // A double-tapped submit button should not become two leads. Same site and
    // same address within five minutes is the same enquiry.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent, error: recentErr } = await supabase
        .from('microsite_leads')
        .select('id')
        .eq('site_id', site.id)
        .eq('email', email)
        .gte('created_at', fiveMinutesAgo)
        .limit(1)

    if (recentErr) {
        // Fail open on the duplicate check only. Losing a real lead to a
        // transient read error is worse than storing the same one twice.
        console.error('[microsite/lead] duplicate check failed, continuing:', recentErr.message)
    } else if (recent && recent.length > 0) {
        console.log('[microsite/lead] duplicate within 5 minutes, not inserting again')
        return res.redirect(303, backTo())
    }

    const sourceUrl = clean(body.source, 500) || (req.headers.referer as string || '').slice(0, 500)

    const { data: inserted, error } = await supabase
        .from('microsite_leads')
        .insert({
            site_id: site.id,
            name,
            email,
            phone: phone || null,
            address: address || null,
            bedrooms: bedrooms || null,
            notes: notes || null,
            source_url: sourceUrl || null,
        })
        .select('id, created_at')
        .single()

    if (error) {
        console.error('[microsite/lead] insert failed:', error)
        return rejectToForm('server')
    }

    // Notify. Deliberately after the insert and never fatal: the lead is
    // already safe in the database, and failing the visitor's redirect because
    // a mail provider was slow would lose the enquiry for no reason.
    try {
        const rows: Array<[string, string]> = [
            ['Name', name],
            ['Email', email],
            ['Phone', phone || '—'],
            ['Property', address],
            ['Bedrooms', bedrooms || '—'],
            ['Notes', notes || '—'],
            ['Source', sourceUrl || '—'],
        ]
        const content = `
      <h1>New quote request</h1>
      <p>${esc(site.label)} — received ${new Date(inserted.created_at).toUTCString()}.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
        ${rows
                .map(
                    ([k, v]) =>
                        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;"><strong>${esc(k)}</strong></td>` +
                        `<td style="padding:6px 0;vertical-align:top;">${esc(v).replace(/\n/g, '<br>')}</td></tr>`
                )
                .join('')}
      </table>
      <p>Reply to <a href="mailto:${esc(email)}">${esc(email)}</a>${phone ? ` or call ${esc(phone)}` : ''}.</p>
    `
        const mail = await sendTransactionalEmail({
            to: NOTIFY_TO,
            cc: NOTIFY_CC,
            subject: `New quote request — ${site.label}`,
            content,
        })
        if (!mail.success) {
            console.error('[microsite/lead] notification failed:', mail.error)
        } else {
            console.log(`[microsite/lead] notified via ${mail.provider} for lead ${inserted.id}`)
        }
    } catch (err) {
        console.error('[microsite/lead] notification threw:', err)
    }

    return res.redirect(303, backTo())
}
