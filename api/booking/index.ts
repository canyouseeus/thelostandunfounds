import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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
    const supabase = getSupabase(true)
    const {
        name,
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

    const { data, error } = await supabase
        .from('bookings')
        .insert({
            name: name.trim(),
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
        return res.status(500).json({ error: 'Failed to submit booking request' })
    }

    // Fire-and-forget notification email (best effort)
    const notifyUrl = process.env.VITE_SITE_URL
        ? `${process.env.VITE_SITE_URL}/api/booking?action=notify`
        : null
    if (notifyUrl) {
        fetch(notifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: data.id })
        }).catch(() => {})
    }

    return res.status(200).json({ success: true, bookingId: data.id })
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
