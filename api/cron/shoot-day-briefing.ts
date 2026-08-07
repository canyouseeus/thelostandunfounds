import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js'
import { BRAND } from '../../lib/email-template.js'

/**
 * Cron: shoot-day briefing to the photographer.
 * Schedule: daily at 14:00 UTC (9AM Central), configured in vercel.json.
 *
 * The photographer was previously briefed by hand at assignment time, which
 * meant the details were written once — before the shoot could move — and were
 * stale by the day itself. One booking was rescheduled twice after its
 * assignment mail went out, so the only copy of the call time the photographer
 * held was wrong.
 *
 * This reads the booking row on the morning of the shoot, so whatever it says
 * then is what gets sent.
 *
 * DEPOSIT GATE: a booking with no deposit is a request, not a job (see
 * `email-billing` RULE 7). Sending someone to an unsecured shoot is how a
 * subcontractor ends up holding a call time for work that was never paid for,
 * which has already happened once. Unpaid bookings brief the OWNER instead.
 */

const PHOTOGRAPHER_EMAIL = process.env.PHOTOGRAPHER_EMAIL || 'four5culture@gmail.com'
const BUSINESS_RECORD = 'media@thelostandunfounds.com'
const OWNER_EMAIL = 'thelostandunfounds@gmail.com'

/** Today's date in the operating timezone, not the server's. */
function todayInAustin(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function fmtTime(t: string | null): string {
  if (!t) return 'TBC'
  const [hStr, m] = t.split(':')
  const h = Number(hStr)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === '00' ? `${h12}:00 ${suffix}` : `${h12}:${m} ${suffix}`
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

interface BookingRow {
  id: string
  name: string | null
  business_name: string | null
  event_type: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
  admin_notes: string | null
  deposit_paid_at: string | null
  status: string | null
}

/**
 * Briefing body. Deliberately contains no links — a bare URL is repainted by
 * the mail client (`email-rendering` RULE 7) and there is nothing here the
 * photographer needs to click.
 */
function buildBriefing(b: BookingRow): string {
  const t = BRAND.colors.text
  const m = BRAND.colors.textMuted
  const p = (s: string) =>
    `<p style="color:${t} !important;font-size:15px;line-height:1.7;margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">${s}</p>`
  const row = (label: string, value: string) =>
    `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;">
       <span style="color:${m} !important;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;display:block;margin-bottom:2px;">${esc(label)}</span>
       <span style="color:${t} !important;font-size:16px;">${value}</span>
     </p>`

  const client = [b.name, b.business_name].filter(Boolean).map(esc).join(' — ') || 'Client'
  const window = `${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}`

  return `
    <h1 style="color:${t} !important;font-size:24px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;">TODAY'S SHOOT</h1>
    ${p('Everything you need for today, in one place.')}
    ${row('Call time', esc(window))}
    ${row('Address', esc(b.location || 'See notes'))}
    ${row('Client', client)}
    ${row('Shoot type', esc(b.event_type || 'Photography'))}
    ${b.notes ? row('Access &amp; notes', esc(b.notes).replace(/\n/g, '<br>')) : ''}
    ${p('Deliverables: 25–35 edited photos, back to the client within 24–72 hours.')}
    ${p(`<span style="color:${m} !important;">Deposit is paid and the booking is secured. If anything on site is not as described, reply here rather than reshooting blind.</span>`)}
  `
}

function buildUnpaidAlert(b: BookingRow): string {
  const t = BRAND.colors.text
  const p = (s: string) =>
    `<p style="color:${t} !important;font-size:15px;line-height:1.7;margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">${s}</p>`
  return `
    <h1 style="color:${t} !important;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">UNPAID SHOOT TODAY</h1>
    ${p(`<strong>${esc(b.name || 'A client')}</strong> is booked today, ${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}, at ${esc(b.location || 'an unspecified location')}.`)}
    ${p('<strong>No deposit has been recorded</strong>, so the photographer has NOT been briefed and has not been sent to it.')}
    ${p('Either collect the deposit and brief them yourself, or stand the shoot down.')}
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret
  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  const today = todayInAustin()
  const { data, error } = await supabase
    .from('bookings')
    .select('id, name, business_name, event_type, event_date, start_time, end_time, location, notes, admin_notes, deposit_paid_at, status')
    .eq('event_date', today)
    .in('status', ['pending', 'confirmed'])

  if (error) {
    console.error('[shoot-day-briefing] query failed:', error.message)
    return res.status(500).json({ error: error.message })
  }

  const bookings = (data || []) as BookingRow[]
  const marker = `[briefed ${today}]`
  const results: Array<{ id: string; outcome: string }> = []

  for (const b of bookings) {
    // Re-running the cron must not re-send. The stamp is the record.
    if ((b.admin_notes || '').includes(marker)) {
      results.push({ id: b.id, outcome: 'already-briefed' })
      continue
    }

    const paid = !!b.deposit_paid_at
    try {
      if (paid) {
        await sendTransactionalEmail({
          to: PHOTOGRAPHER_EMAIL,
          cc: BUSINESS_RECORD,
          subject: `Today's shoot — ${fmtTime(b.start_time)} — ${b.location || 'see details'}`,
          content: buildBriefing(b),
        })
      } else {
        // Not a briefing: the owner is told, the photographer is not moved.
        await sendTransactionalEmail({
          to: OWNER_EMAIL,
          subject: `Unpaid shoot today — ${b.name || 'client'} — no deposit, photographer not briefed`,
          content: buildUnpaidAlert(b),
        })
      }
      await supabase
        .from('bookings')
        .update({ admin_notes: `${b.admin_notes || ''} ${marker}`.trim() })
        .eq('id', b.id)
      results.push({ id: b.id, outcome: paid ? 'briefed' : 'unpaid-owner-alerted' })
    } catch (err: any) {
      // One failure must not stop the rest of the day's shoots.
      console.error(`[shoot-day-briefing] ${b.id} failed:`, err?.message)
      results.push({ id: b.id, outcome: `failed: ${err?.message || 'unknown'}` })
    }
  }

  console.log(`[shoot-day-briefing] ${today}: ${results.length} booking(s)`, results)
  return res.status(200).json({ date: today, count: results.length, results })
}
