import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils.js'
import { generateTransactionalEmail } from '../../lib/email-template.js'

const NOTIFY_TO = 'media@thelostandunfounds.com'

function getSupabase(serviceRole = false) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = serviceRole
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
        : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase credentials')
    return createClient(url, key)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query

    try {
        // Public: get available/blocked dates
        if (req.method === 'GET' && action === 'availability') {
            return await handleGetAvailability(req, res)
        }

        // Public: get booked time slots for a specific date (for conflict UI)
        if (req.method === 'GET' && action === 'slots') {
            return await handleGetSlots(req, res)
        }

        // Public: submit a booking request
        if (req.method === 'POST' && action === 'request') {
            return await handleBookingRequest(req, res)
        }

        // Admin: list all bookings
        if (req.method === 'GET' && action === 'admin') {
            return await handleAdminList(req, res)
        }

        // Admin: update booking status or add blocked date
        if (req.method === 'PATCH' && action === 'admin') {
            return await handleAdminUpdate(req, res)
        }

        // Admin: block/unblock a date
        if (req.method === 'POST' && action === 'block') {
            return await handleBlockDate(req, res)
        }

        if (req.method === 'DELETE' && action === 'block') {
            return await handleUnblockDate(req, res)
        }

        if (req.method === 'POST' && action === 'notify') {
            return await handleNotify(req, res)
        }

        return res.status(404).json({ error: 'Route not found' })
    } catch (err: any) {
        console.error('[Booking API] Error:', err)
        return res.status(500).json({ error: 'Server error', message: err.message })
    }
}

async function handleGetAvailability(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabase()

    const { data: blocked, error } = await supabase
        .from('booking_availability')
        .select('date, is_blocked, note')
        .eq('is_blocked', true)
        .order('date', { ascending: true })

    if (error) {
        console.error('[Availability] Query error:', error)
        return res.status(500).json({ error: 'Failed to fetch availability' })
    }

    // Only dates explicitly blocked by the admin are unselectable. Multiple
    // bookings can exist on the same day (different time slots / types).
    return res.status(200).json({
        blockedDates: (blocked || []).map(b => b.date)
    })
}

async function handleGetSlots(req: VercelRequest, res: VercelResponse) {
    const date = (req.query.date as string | undefined) || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date (YYYY-MM-DD) required' })
    }
    const supabase = getSupabase(true)
    const [bookingsRes, eventsRes] = await Promise.all([
        supabase
            .from('bookings')
            .select('start_time, end_time, status')
            .eq('event_date', date)
            .in('status', ['pending', 'confirmed']),
        // Events on this date — the photographer is already committed to them.
        // Surface them so the booking form can warn the client before picking
        // a conflicting window.
        supabase
            .from('events')
            .select('id, title, status, location')
            .eq('event_date', date)
            .neq('status', 'cancelled'),
    ])
    if (bookingsRes.error) {
        console.error('[Slots] Query error:', bookingsRes.error)
        return res.status(500).json({ error: 'Failed to fetch slots' })
    }
    return res.status(200).json({
        slots: (bookingsRes.data || [])
            .filter(b => b.start_time || b.end_time)
            .map(b => ({ start_time: b.start_time, end_time: b.end_time })),
        events: (eventsRes.data || []).map(e => ({
            id: e.id,
            title: e.title,
            location: e.location,
        })),
    })
}

async function handleBookingRequest(req: VercelRequest, res: VercelResponse) {
    try {
        return await handleBookingRequestInner(req, res)
    } catch (err: any) {
        console.error('[BookingRequest] Uncaught error:', err)
        return res.status(500).json({
            error: 'Booking request crashed',
            message: err?.message || String(err),
            stack: err?.stack?.split('\n').slice(0, 6).join(' | '),
        })
    }
}

async function handleBookingRequestInner(req: VercelRequest, res: VercelResponse) {
    const supabase = getSupabase(true)
    const {
        name,
        business_name,
        email,
        phone,
        event_type,
        event_date,
        start_time,
        end_time,
        location,
        notes,
        retainer
    } = req.body

    if (!name || !email || !event_type || !event_date) {
        return res.status(400).json({ error: 'name, email, event_type, and event_date are required' })
    }

    // Simple email format check
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email' })
    }

    // Respect admin-blocked dates only. We intentionally do NOT treat other
    // pending/confirmed bookings as a hard block on the date — multiple shoots
    // per day are common (a morning portrait + an evening show, etc.), and
    // the admin will handle scheduling conflicts manually through the
    // dashboard. Dates only become unselectable when explicitly blocked in
    // booking_availability.
    const { data: adminBlocked } = await supabase
        .from('booking_availability')
        .select('date')
        .eq('date', event_date)
        .eq('is_blocked', true)
        .limit(1)

    if (adminBlocked && adminBlocked.length > 0) {
        return res.status(409).json({
            error: 'This date is not available. Please pick another date.'
        })
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            name: name.trim(),
            business_name: business_name?.trim() || null,
            email: email.toLowerCase().trim(),
            phone: phone?.trim() || null,
            event_type: event_type.trim(),
            event_date,
            start_time: start_time || null,
            end_time: end_time || null,
            location: location?.trim() || null,
            notes: notes?.trim() || null,
            retainer: retainer === true,
            status: 'pending'
        })
        .select('id')
        .single()

    if (error) {
        console.error('[BookingRequest] Insert error:', error)
        return res.status(500).json({ error: 'Failed to submit booking request', details: error.message })
    }

    // Send notification email inline (best-effort). We await it so there's no
    // dangling promise after res.json() — Vercel kills the function when the
    // response is sent, and a rejected pending fetch was surfacing as
    // FUNCTION_INVOCATION_FAILED.
    let notify: { sent: boolean; error?: string } = { sent: false }
    try {
        await sendBookingNotification(data.id as string, supabase)
        notify = { sent: true }
    } catch (notifyErr: any) {
        // Non-fatal — booking is saved, admin just didn't get the email.
        const msg = notifyErr?.message || String(notifyErr)
        console.warn('[BookingRequest] notify failed:', msg)
        notify = { sent: false, error: msg }
    }

    return res.status(200).json({ success: true, bookingId: data.id, notify })
}

async function sendBookingNotification(bookingId: string, supabase: ReturnType<typeof getSupabase>) {
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
    if (error || !booking) return

    const auth = await getZohoAuthContext()

    // Admin notification — structured summary wrapped in brand template
    const adminSubject = `New Booking Inquiry — ${booking.event_type || 'Other'} — ${booking.name}`
    const adminHtml = generateTransactionalEmail(buildAdminSummaryBody(booking))
    await sendZohoEmail({ auth, to: NOTIFY_TO, subject: adminSubject, htmlContent: adminHtml })

    // Client confirmation — warm recap of what they submitted, wrapped in
    // the same branded template so the header + logo match the site.
    if (booking.email) {
        const clientSubject = `We got your booking request — TLAU`
        const clientHtml = generateTransactionalEmail(buildClientConfirmationBody(booking))
        try {
            await sendZohoEmail({ auth, to: booking.email, subject: clientSubject, htmlContent: clientHtml })
        } catch (err) {
            // Don't let a client-send failure abort the admin flow
            console.warn('[BookingNotify] client confirmation failed:', (err as any)?.message)
        }
    }
}

async function handleAdminList(req: VercelRequest, res: VercelResponse) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabase(true)
    const { status } = req.query

    let query = supabase
        .from('bookings')
        .select('*')
        .order('event_date', { ascending: true })

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ bookings: data })
}

async function handleAdminUpdate(req: VercelRequest, res: VercelResponse) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabase(true)
    const { id, status, admin_notes } = req.body

    if (!id) return res.status(400).json({ error: 'Booking id required' })

    const updates: Record<string, any> = {}
    if (status) updates.status = status
    if (admin_notes !== undefined) updates.admin_notes = admin_notes

    const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
}

async function handleBlockDate(req: VercelRequest, res: VercelResponse) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabase(true)
    const { date, note } = req.body

    if (!date) return res.status(400).json({ error: 'date required' })

    const { error } = await supabase
        .from('booking_availability')
        .upsert({ date, is_blocked: true, note: note || null }, { onConflict: 'date' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
}

async function handleUnblockDate(req: VercelRequest, res: VercelResponse) {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

    const supabase = getSupabase(true)
    const { date } = req.body

    if (!date) return res.status(400).json({ error: 'date required' })

    const { error } = await supabase
        .from('booking_availability')
        .delete()
        .eq('date', date)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
}

function isAdmin(req: VercelRequest): boolean {
    // Check for admin secret header from internal calls or admin UI
    const secret = req.headers['x-admin-secret']
    return secret === process.env.ADMIN_SECRET
}

async function handleNotify(req: VercelRequest, res: VercelResponse) {
    const { bookingId } = req.body
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' })

    const supabase = getSupabase(true)
    try {
        await sendBookingNotification(bookingId, supabase)
        return res.status(200).json({ success: true })
    } catch (err: any) {
        console.error('[booking notify] threw:', err?.message)
        return res.status(500).json({ error: err?.message || 'Notify failed' })
    }
}

function formatEventDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '—'
    const [y, m, d] = isoDate.split('-').map(Number)
    if (!y || !m || !d) return isoDate
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
}

function buildAdminSummaryBody(booking: any): string {
    const label = 'color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;vertical-align:top;white-space:nowrap;'
    const value = 'color:#fff;font-size:14px;padding:8px 0;vertical-align:top;'
    const row = (k: string, v: string) =>
        `<tr><td style="${label}">${k}</td><td style="${value}">${v}</td></tr>`
    return `
        <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 8px 0;letter-spacing:0.05em;">NEW BOOKING INQUIRY</h1>
        <p style="color:#999;font-size:13px;margin:0 0 24px 0;">Submitted ${escapeHtml(new Date(booking.created_at).toLocaleString())}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row('Name', escapeHtml(booking.name))}
            ${booking.business_name ? row('Business', escapeHtml(booking.business_name)) : ''}
            ${row('Email', `<a href="mailto:${escapeHtml(booking.email)}" style="color:#fff;text-decoration:underline;">${escapeHtml(booking.email)}</a>`)}
            ${booking.phone ? row('Phone', escapeHtml(booking.phone)) : ''}
            ${row('Shoot Type', escapeHtml(booking.event_type || '—'))}
            ${row('Date', escapeHtml(formatEventDate(booking.event_date)))}
            ${booking.start_time || booking.end_time ? row('Time', `${escapeHtml(booking.start_time || '?')} – ${escapeHtml(booking.end_time || '?')}`) : ''}
            ${booking.location ? row('Location', escapeHtml(booking.location)) : ''}
            ${booking.retainer ? row('Retainer', 'Yes (monthly)') : ''}
        </table>
        ${booking.notes ? `
            <p style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;margin:24px 0 8px 0;">Notes</p>
            <p style="color:#fff !important;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${escapeHtml(booking.notes).replace(/\n/g, '<br>')}</p>
        ` : ''}
        <p style="color:#666;font-size:12px;margin:32px 0 0 0;">Booking ID: <code style="color:#888;">${escapeHtml(booking.id)}</code></p>
    `
}

function buildClientConfirmationBody(booking: any): string {
    const firstName = (booking.name || '').split(' ')[0] || 'there'
    const label = 'color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;padding:8px 16px 4px 0;vertical-align:top;white-space:nowrap;'
    const value = 'color:#fff;font-size:14px;padding:8px 0;vertical-align:top;'
    const row = (k: string, v: string) =>
        `<tr><td style="${label}">${k}</td><td style="${value}">${v}</td></tr>`
    return `
        <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 16px 0;letter-spacing:0.05em;">YOUR BOOKING REQUEST IS IN</h1>
        <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
            Hey ${escapeHtml(firstName)} — thanks for reaching out. Your request is held while we talk.
            I'll get back to you within 24 hours to scope the shoot and sort out logistics.
            Nothing is finalized until we've aligned and the 50% deposit is received.
        </p>
        <p style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;margin:24px 0 8px 0;">What you submitted</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            ${booking.business_name ? row('Business', escapeHtml(booking.business_name)) : ''}
            ${row('Shoot Type', escapeHtml(booking.event_type || '—'))}
            ${row('Date', escapeHtml(formatEventDate(booking.event_date)))}
            ${booking.start_time || booking.end_time ? row('Time', `${escapeHtml(booking.start_time || '?')} – ${escapeHtml(booking.end_time || '?')}`) : ''}
            ${booking.location ? row('Location', escapeHtml(booking.location)) : ''}
        </table>
        <p style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;margin:24px 0 8px 0;">The deposit</p>
        <p style="color:#fff !important;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            A <b>50% non-refundable deposit</b> holds the date and locks the booking. Once we
            confirm scope, I'll send a contract and a payment link. We accept
            <b>Bitcoin (Strike)</b>, Apple Pay, Cashapp, and Venmo.
        </p>
        <p style="color:#fff !important;font-size:14px;line-height:1.6;margin:24px 0 8px 0;">
            If anything needs to change on your end, just reply to this email.
        </p>
        <p style="color:#fff !important;font-size:14px;margin:32px 0 0 0;">— Joshua / TLAU</p>
    `
}

function escapeHtml(s: string): string {
    if (s == null) return ''
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
