import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Unified site-wide calendar aggregator.
 *
 * GET /api/calendar/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns every piece of activity on-site in the window so a single
 * master calendar can surface bookings, events, and photo activity
 * without each module having to fetch independently.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const start = String(req.query.start || '')
    const end = String(req.query.end || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return res.status(400).json({ error: 'start and end (YYYY-MM-DD) are required' })
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    try {
        const [bookingsRes, eventsRes, photosRes, availabilityRes, notesRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('id, name, business_name, email, event_type, event_date, start_time, end_time, location, status, retainer')
                .gte('event_date', start)
                .lte('event_date', end)
                .in('status', ['pending', 'confirmed']),
            supabase
                .from('events')
                .select('id, title, event_date, status, location, ticket_tiers, image_url')
                .gte('event_date', start)
                .lte('event_date', end)
                .neq('status', 'cancelled'),
            // Pull photos by EXIF date_taken when available, else created_at.
            // We select the minimum fields we need; aggregating client-side is
            // fine since ranges are typically bounded.
            supabase
                .from('photos')
                .select('id, title, thumbnail_url, created_at, metadata, library_id')
                .gte('created_at', `${start}T00:00:00Z`)
                .lte('created_at', `${end}T23:59:59Z`)
                .order('created_at', { ascending: false })
                .limit(500),
            supabase
                .from('booking_availability')
                .select('date, note')
                .eq('is_blocked', true)
                .gte('date', start)
                .lte('date', end),
            supabase
                .from('calendar_notes')
                .select('id, date, note, created_at')
                .gte('date', start)
                .lte('date', end)
                .order('created_at', { ascending: false }),
        ])

        const bookings = bookingsRes.data || []
        const events = eventsRes.data || []
        const photos = photosRes.data || []
        const adminBlocked = availabilityRes.data || []
        const notes = notesRes.data || []

        // Group photos by effective date (EXIF date_taken when present,
        // else created_at). The grouped bucket is what the "day at a glance"
        // card renders; full photo list is also available for the deep view.
        const photosByDate = new Map<string, Array<{ id: string; title: string; thumbnail_url: string; created_at: string }>>()
        for (const p of photos as any[]) {
            const d: string = p.metadata?.date_taken || p.created_at
            const dateKey = d ? d.slice(0, 10) : null
            if (!dateKey) continue
            if (dateKey < start || dateKey > end) continue
            if (!photosByDate.has(dateKey)) photosByDate.set(dateKey, [])
            photosByDate.get(dateKey)!.push({
                id: p.id,
                title: p.title,
                thumbnail_url: p.thumbnail_url,
                created_at: p.created_at,
            })
        }

        const photosByDateObj: Record<string, typeof photos> = {}
        for (const [k, v] of photosByDate) photosByDateObj[k] = v as any

        return res.status(200).json({
            range: { start, end },
            bookings,
            events,
            adminBlocked,
            notes,
            photos: photosByDateObj,
            summary: {
                bookingCount: bookings.length,
                eventCount: events.length,
                photoCount: photos.length,
                blockedCount: adminBlocked.length,
                noteCount: notes.length,
            },
        })
    } catch (err: any) {
        console.error('[Calendar] range error:', err)
        return res.status(500).json({ error: err?.message || 'Failed to load calendar range' })
    }
}
