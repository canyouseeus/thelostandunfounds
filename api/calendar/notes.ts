import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin calendar notes: attach free-form notes to calendar dates.
 *
 * POST   /api/calendar/notes    { date: 'YYYY-MM-DD', note: '...' }
 * DELETE /api/calendar/notes    ?id=<uuid>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    try {
        if (req.method === 'POST') {
            const date: string = (req.body?.date || '').trim()
            const note: string = (req.body?.note || '').trim()
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' })
            }
            if (!note) return res.status(400).json({ error: 'note is required' })
            if (note.length > 2000) return res.status(400).json({ error: 'note must be <= 2000 chars' })

            const { data, error } = await supabase
                .from('calendar_notes')
                .insert({ date, note })
                .select('id, date, note, created_at')
                .single()
            if (error) {
                console.error('[CalendarNotes] insert error:', error)
                return res.status(500).json({ error: error.message })
            }
            return res.status(200).json({ note: data })
        }

        if (req.method === 'DELETE') {
            const id = String(req.query.id || '')
            if (!/^[0-9a-f-]{36}$/i.test(id)) {
                return res.status(400).json({ error: 'id (uuid) is required' })
            }
            const { error } = await supabase
                .from('calendar_notes')
                .delete()
                .eq('id', id)
            if (error) {
                console.error('[CalendarNotes] delete error:', error)
                return res.status(500).json({ error: error.message })
            }
            return res.status(200).json({ success: true })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (err: any) {
        console.error('[CalendarNotes] unhandled:', err)
        return res.status(500).json({ error: err?.message || 'Server error' })
    }
}
