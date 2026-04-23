import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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

    // Also get pending/confirmed bookings so dates can be shown as taken
    const { data: bookings } = await supabase
        .from('bookings')
        .select('event_date, status')
        .in('status', ['pending', 'confirmed'])

    const bookedDates = bookings?.map(b => b.event_date) || []
    const blockedDates = blocked?.map(b => b.date) || []

    return res.status(200).json({
        blockedDates: [...new Set([...blockedDates, ...bookedDates])]
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

    // Race-condition guard: if any active booking (pending or confirmed) already
    // holds this date, reject before inserting. The calendar normally hides taken
    // dates, but two clients submitting simultaneously would both see it as free.
    const { data: existing } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('event_date', event_date)
        .in('status', ['pending', 'confirmed'])
        .limit(1)

    if (existing && existing.length > 0) {
        return res.status(409).json({
            error: 'This date was just requested by someone else. Please pick another date.'
        })
    }

    // Also respect any admin-blocked dates
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

    const subject = `New Booking Inquiry — ${booking.event_type || 'Other'} — ${booking.name}`
    const html = buildBookingEmailHtml(booking)
    // Dynamic import so a module-load issue in _zoho-email-utils can't crash
    // the main request handler. This only runs after the booking is saved.
    const { getZohoAuthContext, sendZohoEmail } = await import('../../lib/api-handlers/_zoho-email-utils')
    const auth = await getZohoAuthContext()
    await sendZohoEmail({ auth, to: NOTIFY_TO, subject, htmlContent: html })
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

function buildBookingEmailHtml(booking: any): string {
    return `
        <h2 style="font-family:Arial,sans-serif">New booking inquiry</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 12px 6px 0"><b>Name</b></td><td>${escapeHtml(booking.name)}</td></tr>
            ${booking.business_name ? `<tr><td style="padding:6px 12px 6px 0"><b>Business</b></td><td>${escapeHtml(booking.business_name)}</td></tr>` : ''}
            <tr><td style="padding:6px 12px 6px 0"><b>Email</b></td><td><a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></td></tr>
            ${booking.phone ? `<tr><td style="padding:6px 12px 6px 0"><b>Phone</b></td><td>${escapeHtml(booking.phone)}</td></tr>` : ''}
            <tr><td style="padding:6px 12px 6px 0"><b>Type</b></td><td>${escapeHtml(booking.event_type || '—')}</td></tr>
            <tr><td style="padding:6px 12px 6px 0"><b>Date</b></td><td>${escapeHtml(booking.event_date || '—')}</td></tr>
            ${booking.start_time || booking.end_time ? `<tr><td style="padding:6px 12px 6px 0"><b>Time</b></td><td>${escapeHtml(booking.start_time || '?')} – ${escapeHtml(booking.end_time || '?')}</td></tr>` : ''}
            ${booking.location ? `<tr><td style="padding:6px 12px 6px 0"><b>Location</b></td><td>${escapeHtml(booking.location)}</td></tr>` : ''}
            ${booking.retainer ? `<tr><td style="padding:6px 12px 6px 0"><b>Retainer</b></td><td>Yes</td></tr>` : ''}
        </table>
        ${booking.notes ? `<p style="font-family:Arial,sans-serif;font-size:14px;margin-top:18px"><b>Notes:</b><br>${escapeHtml(booking.notes).replace(/\n/g, '<br>')}</p>` : ''}
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#666;margin-top:24px">
            Booking ID: <code>${booking.id}</code><br>
            Submitted: ${new Date(booking.created_at).toLocaleString()}
        </p>
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
