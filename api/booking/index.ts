import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { triggerReferralCommission } from '../../lib/api-handlers/affiliates/_commission-trigger.js'
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js'
import {
    createQuoteForBooking,
    siteOrigin,
    getDefaultPhotographer,
    sendPhotographerAssignment,
} from '../../lib/api-handlers/_booking-payment-utils.js'
import { BUFFER_MINUTES, findBufferConflict } from '../../lib/booking-buffer.js'

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

        // Express booking: look up the client behind a personal booking link
        if (req.method === 'GET' && action === 'client') {
            return await handleGetClient(req, res)
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

/**
 * Resolve a client for the express booking modal.
 *
 * Keyed on the client's row id, which we only ever put in a link sent to that
 * client. Returns the minimum the modal needs to greet them and prefill the
 * booking — name, email, business — and nothing else on the record.
 */
async function handleGetClient(req: VercelRequest, res: VercelResponse) {
    const id = (req.query.id as string | undefined) || ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: 'valid client id required' })
    }
    const supabase = getSupabase(true)
    const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, business')
        .eq('id', id)
        .maybeSingle()

    if (error) {
        console.error('[Client lookup] Query error:', error)
        return res.status(500).json({ error: 'Failed to look up client' })
    }
    if (!data) return res.status(404).json({ error: 'Client not found' })

    return res.status(200).json({
        client: {
            id: data.id,
            name: data.name,
            email: data.email,
            business: data.business,
        },
    })
}

async function handleGetSlots(req: VercelRequest, res: VercelResponse) {
    const date = (req.query.date as string | undefined) || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date (YYYY-MM-DD) required' })
    }
    const supabase = getSupabase(true)
    const [bookingsRes, eventsRes, availRes] = await Promise.all([
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
        // Per-date slot window. Photography is subcontracted, so a date is
        // often only partially coverable. NULL allowed_slots means no
        // restriction and every slot stays open.
        supabase
            .from('booking_availability')
            .select('allowed_slots')
            .eq('date', date)
            .maybeSingle(),
    ])
    if (bookingsRes.error) {
        console.error('[Slots] Query error:', bookingsRes.error)
        return res.status(500).json({ error: 'Failed to fetch slots' })
    }
    const rawAllowed = (availRes as any)?.data?.allowed_slots as string | null | undefined
    const allowedSlots = rawAllowed && rawAllowed.trim()
        ? rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
        : null

    return res.status(200).json({
        slots: (bookingsRes.data || [])
            .filter(b => b.start_time || b.end_time)
            .map(b => ({ start_time: b.start_time, end_time: b.end_time })),
        events: (eventsRes.data || []).map(e => ({
            id: e.id,
            title: e.title,
            location: e.location,
        })),
        allowedSlots,
    })
}

/**
 * Fixed-price photo services, priced server-side.
 *
 * Only services with a real rate card appear here. Web Development, Retainer
 * and Brand / Editorial are quoted case by case, so they are deliberately
 * absent — an automatic Stripe link for a consultation would be wrong.
 *
 * Prices are resolved on the server and never read from the request: the
 * amount a client is charged must not be something they can post.
 */
const AIRBNB_EVENT_TYPE = 'Airbnb / Short-Term Rental'

const AIRBNB_TIERS: Array<{ maxBedrooms: number; price: number; label: string }> = [
  { maxBedrooms: 1, price: 195, label: 'Studio / 1 bedroom' },
  { maxBedrooms: 2, price: 265, label: '2 bedroom' },
  { maxBedrooms: 3, price: 335, label: '3 bedroom' },
  { maxBedrooms: 99, price: 425, label: '4+ bedroom / luxury' },
]

const FIXED_PHOTO_PRICES: Record<string, number> = {
  'Portrait Session': 250,
  'Lifestyle Shoot': 250,
  'Event Coverage': 600,
  'Half-Day Content': 800,
  'Full-Day Content': 1400,
}

/**
 * Resolve a discount code against public.promo_codes.
 *
 * A code arriving on a booking is a claim, never a percentage — the terms live
 * in the database: who may use it, whether it is single-use, whether it has
 * expired, whether it is still active. A hardcoded map had none of those, so a
 * one-time offer could be redeemed for ever by anyone who kept the link.
 *
 * Returns null when the code does not apply, which simply means full price.
 */
async function resolvePromo(
  supabase: ReturnType<typeof getSupabase>,
  rawCode: string | null,
  clientEmail: string,
): Promise<{ code: string; pct: number; amount: number | null; finalPrice: number | null } | null> {
  if (!rawCode) return null
  const code = rawCode.toUpperCase()

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('code, discount_pct, discount_amount, final_price, client_id, single_use, used_at, expires_at, active')
    .eq('code', code)
    .maybeSingle()

  if (!promo || !promo.active) return null
  if (promo.single_use && promo.used_at) return null
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return null

  // A code issued to one client is not transferable.
  if (promo.client_id) {
    const { data: owner } = await supabase
      .from('clients')
      .select('email')
      .eq('id', promo.client_id)
      .maybeSingle()
    if (!owner?.email || owner.email.toLowerCase() !== clientEmail.toLowerCase()) return null
  }

  return {
    code: promo.code,
    pct: promo.discount_pct != null ? Number(promo.discount_pct) : 0,
    amount: promo.discount_amount != null ? Number(promo.discount_amount) : null,
    finalPrice: promo.final_price != null ? Number(promo.final_price) : null,
  }
}

function resolvePhotoPrice(
  eventType: string,
  bedrooms?: number,
): { price: number; label: string } | null {
  if (eventType === AIRBNB_EVENT_TYPE) {
    const n = Number(bedrooms)
    if (!Number.isFinite(n) || n < 0) return null
    const tier = AIRBNB_TIERS.find(t => n <= t.maxBedrooms) || AIRBNB_TIERS[AIRBNB_TIERS.length - 1]
    return { price: tier.price, label: `Airbnb listing photography (${tier.label})` }
  }
  const flat = FIXED_PHOTO_PRICES[eventType]
  if (flat) return { price: flat, label: `Photography — ${eventType}` }
  return null
}

function extractPromoCode(notes: string | null | undefined): string | null {
  if (!notes) return null
  const m = /Promo code:\s*([A-Za-z0-9-]{3,24})/i.exec(notes)
  return m ? m[1].toUpperCase() : null
}


/**
 * Test bookings must never reach a client.
 *
 * A run through the express modal with a real client link created a real
 * booking, a real invoice and a live Stripe payment link, and emailed all of it
 * to the client — because nothing in the flow distinguishes a rehearsal from a
 * real booking. The client received a quote for a shoot that did not exist.
 *
 * A booking is treated as a test when the request says so (?test=1 or
 * test: true) or when the details are obviously placeholder. Test bookings are
 * still recorded — so the flow can be exercised end to end — but they are
 * marked, no invoice is generated, no Stripe link is created, and nothing is
 * emailed to the client.
 */
const PLACEHOLDER_LOCATION = /^(test|testing|asdf|xxx|123|n\/a|na|dummy|placeholder)\b/i

function isTestBooking(req: VercelRequest, body: any): boolean {
    if (body?.test === true) return true
    const q = String(req.query.test || '')
    if (q === '1' || q.toLowerCase() === 'true') return true
    if (typeof body?.location === 'string' && PLACEHOLDER_LOCATION.test(body.location.trim())) return true
    if (typeof body?.name === 'string' && /^test\b/i.test(body.name.trim())) return true
    return false
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
        retainer,
        // Only used to pick a rate-card tier — the price itself is resolved
        // server-side from this, never taken from the request.
        bedrooms
    } = req.body

    if (!name || !email || !event_type || !event_date) {
        return res.status(400).json({ error: 'name, email, event_type, and event_date are required' })
    }

    // Simple email format check
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email' })
    }

    // Dates can be closed outright in booking_availability, and a shoot
    // already on the books reserves its window plus a travel buffer (see the
    // buffer check below). Multiple shoots a day are still fine — they just
    // have to be far enough apart for one photographer to make both.
    const { data: availRow } = await supabase
        .from('booking_availability')
        .select('is_blocked, allowed_slots')
        .eq('date', event_date)
        .maybeSingle()

    if (availRow?.is_blocked) {
        return res.status(409).json({
            error: 'This date is not available. Please pick another date.'
        })
    }

    // The form hides slots outside the day's window, but the endpoint is
    // reachable directly — enforce the window here too rather than trusting
    // the client, or a request lands for a time nobody can cover.
    const allowedSlots = availRow?.allowed_slots?.trim()
        ? availRow.allowed_slots.split(',').map((s: string) => s.trim()).filter(Boolean)
        : null
    if (allowedSlots && start_time) {
        const SLOT_STARTS: Record<string, string> = {
            'Early Morning': '06:00',
            'Morning': '09:00',
            'Afternoon': '12:00',
            'Evening': '17:00',
            'Night': '20:00',
        }
        const requested = String(start_time).slice(0, 5)
        const permitted = allowedSlots.map((l: string) => SLOT_STARTS[l]).filter(Boolean)
        if (permitted.length > 0 && !permitted.includes(requested)) {
            return res.status(409).json({
                error: 'That time is not available on this date. Please pick another slot.'
            })
        }
    }

    // A shoot reserves its window plus travel time on each side. The forms grey
    // out slots that collide, but the endpoint is reachable directly, so the
    // real guard has to be here — this is what stops one photographer being
    // committed to two jobs that cannot both be reached.
    if (start_time) {
        const { data: sameDay, error: sameDayErr } = await supabase
            .from('bookings')
            .select('start_time, end_time')
            .eq('event_date', event_date)
            .in('status', ['pending', 'confirmed'])
        if (sameDayErr) {
            // Fail closed: without the day's bookings we cannot prove the slot
            // is clear, and a double-booked photographer is worse than a
            // client retrying.
            console.error('[BookingRequest] conflict lookup failed:', sameDayErr)
            return res.status(503).json({
                error: 'Could not verify availability just now. Please try again in a moment.'
            })
        }
        const conflict = findBufferConflict(start_time, end_time || null, sameDay || [])
        if (conflict) {
            return res.status(409).json({
                error: `That time is too close to another shoot that day. We need ${BUFFER_MINUTES / 60} hours either side of a booking for setup and travel — please pick another slot.`
            })
        }
    }

    const isTest = isTestBooking(req, req.body)

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
            status: isTest ? 'test' : 'pending'
        })
        .select('id')
        .single()

    if (error) {
        console.error('[BookingRequest] Insert error:', error)
        return res.status(500).json({ error: 'Failed to submit booking request', details: error.message })
    }

    // Fixed-price photo shoots are quoted immediately: the client sees an
    // invoice with a Stripe deposit link as soon as they book, rather than
    // waiting for someone to raise it by hand. Consultation-style work
    // (web dev, retainers, brand) resolves to null here and stays manual.
    //
    // Best-effort: a booking that saved is not failed by a quoting problem —
    // the quote can be raised from the admin endpoint afterwards.
    let quote: { created: boolean; invoiceNumber?: string; total?: number; error?: string } = { created: false }
    const pricing = isTest ? null : resolvePhotoPrice(event_type.trim(), bedrooms)
    if (isTest) {
        console.log('[BookingRequest] TEST booking — no invoice, no Stripe link, no client email:', data.id)
        quote = { created: false, error: 'test booking — quoting skipped' }
    }
    if (pricing) {
        try {
            const claimed = extractPromoCode(notes)
            const resolved = await resolvePromo(supabase, claimed, email.toLowerCase().trim())
            const promo = resolved?.code || null

            // final_price beats discount_amount beats discount_pct. A number
            // agreed with a client in writing is stated, not approximated by a
            // percentage that lands near it — 10% off $335 is $301.50, and the
            // client was told $300.
            let total = pricing.price
            let discountLabel: string | null = null
            if (resolved?.finalPrice != null) {
                total = resolved.finalPrice
                discountLabel = `Agreed rate — ${promo}`
            } else if (resolved?.amount != null) {
                total = Math.max(0, pricing.price - resolved.amount)
                discountLabel = `Discount — ${promo}`
            } else if (resolved && resolved.pct > 0) {
                total = Math.round(pricing.price * (1 - resolved.pct / 100) * 100) / 100
                discountLabel = `Discount — ${promo} (${resolved.pct}%)`
            }
            total = Math.round(total * 100) / 100

            const lineItems = [
                { description: pricing.label, quantity: 1, unit_price: pricing.price, amount: pricing.price },
            ]
            if (discountLabel && total < pricing.price) {
                const off = Math.round((pricing.price - total) * 100) / 100
                lineItems.push({
                    description: discountLabel,
                    quantity: 1,
                    unit_price: -off,
                    amount: -off,
                })
            }
            const result = await createQuoteForBooking({
                bookingId: data.id as string,
                totalPrice: total,
                lineItems,
                description: `${pricing.label}${promo ? ` — ${promo} applied` : ''}`,
                origin: siteOrigin(req),
            })
            quote = { created: true, invoiceNumber: result.invoiceNumber, total: result.total }

            // Tell the photographer they have a job. Previously a booking could
            // land with nobody assigned and nobody told — the shoot was passed
            // on by hand, or not at all. Best-effort: the booking and invoice
            // stand whether or not this email gets through.
            try {
                const photographer = await getDefaultPhotographer(supabase as any)
                if (photographer) {
                    await sendPhotographerAssignment({
                        photographer,
                        clientName: name.trim(),
                        eventType: event_type.trim(),
                        eventDate: event_date,
                        startTime: start_time || null,
                        endTime: end_time || null,
                        location: location?.trim() || null,
                        accessNotes: (notes || '').match(/Access:\s*([^\n]+)/i)?.[1] || null,
                        jobTotal: result.total,
                        invoiceNumber: result.invoiceNumber,
                    })
                    // Record who is covering it and what they earn, so the split
                    // is on the invoice rather than in someone's memory.
                    await supabase
                        .from('invoices')
                        .update({
                            contractor_name: photographer.name,
                            contractor_payout: String(
                                Math.round(result.total * (photographer.payout_pct / 100) * 100) / 100,
                            ),
                        })
                        .eq('invoice_number', result.invoiceNumber)
                }
            } catch (assignErr: any) {
                console.warn('[BookingRequest] photographer assignment failed:', assignErr?.message)
            }

            // Burn a single-use code only once the quote actually exists, so a
            // failed quote does not consume the client's discount.
            if (promo && resolved) {
                const { error: burnErr } = await supabase
                    .from('promo_codes')
                    .update({ used_at: new Date().toISOString(), used_by_booking_id: data.id })
                    .eq('code', promo)
                    .eq('single_use', true)
                    .is('used_at', null)
                if (burnErr) console.warn('[BookingRequest] could not mark promo used:', burnErr.message)
            }
        } catch (quoteErr: any) {
            const msg = quoteErr?.message || String(quoteErr)
            console.warn('[BookingRequest] auto-quote failed:', msg)
            quote = { created: false, error: msg }
        }
    }

    // Send notification email inline (best-effort). We await it so there's no
    // dangling promise after res.json() — Vercel kills the function when the
    // response is sent, and a rejected pending fetch was surfacing as
    // FUNCTION_INVOCATION_FAILED.
    let notify: { sent: boolean; error?: string } = { sent: false }
    try {
        if (isTest) {
            notify = { sent: false, error: 'test booking — notifications suppressed' }
            return res.status(200).json({ success: true, test: true, bookingId: data.id, notify, quote })
        }
        await sendBookingNotification(data.id as string, supabase)
        notify = { sent: true }
    } catch (notifyErr: any) {
        // Non-fatal — booking is saved, admin just didn't get the email.
        const msg = notifyErr?.message || String(notifyErr)
        console.warn('[BookingRequest] notify failed:', msg)
        notify = { sent: false, error: msg }
    }

    return res.status(200).json({ success: true, bookingId: data.id, notify, quote })
}

async function sendBookingNotification(bookingId: string, supabase: ReturnType<typeof getSupabase>) {
    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
    if (error || !booking) return

    // Admin notification — structured summary wrapped in brand template
    const adminSubject = `New Booking Inquiry — ${booking.event_type || 'Other'} — ${booking.name}`
    await sendTransactionalEmail({ to: NOTIFY_TO, subject: adminSubject, content: buildAdminSummaryBody(booking) })

    // Client confirmation — warm recap of what they submitted, wrapped in
    // the same branded template so the header + logo match the site.
    if (booking.email) {
        const clientSubject = `We got your booking request — TLAU`
        try {
            await sendTransactionalEmail({ to: booking.email, subject: clientSubject, content: buildClientConfirmationBody(booking) })
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
    const { id, status, admin_notes, total_amount_cents, affiliate_code, notify_customer } = req.body

    if (!id) return res.status(400).json({ error: 'Booking id required' })

    const updates: Record<string, any> = {}
    if (status) updates.status = status
    if (admin_notes !== undefined) updates.admin_notes = admin_notes
    if (typeof total_amount_cents === 'number') updates.total_amount_cents = total_amount_cents
    if (affiliate_code !== undefined) updates.affiliate_code = affiliate_code
    if (status === 'paid' || status === 'completed') {
        updates.paid_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })

    const willTriggerCommission = status === 'paid' || status === 'completed'
    const willNotifyCustomer = !!(status && notify_customer)
    let booking: any = null
    if (willTriggerCommission || willNotifyCustomer) {
        const { data } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single()
        booking = data
    }

    // Fire affiliate commission when this transition lands the booking in
    // a paid state. Idempotent — no-op if already triggered for this booking.
    if (booking && willTriggerCommission) {
        try {
            if (booking.email && booking.total_amount_cents) {
                const result = await triggerReferralCommission(supabase, {
                    email: booking.email,
                    source: 'booking',
                    sourceId: booking.id,
                    grossAmount: Number(booking.total_amount_cents) / 100,
                    fallbackAffiliateCode: booking.affiliate_code || null,
                })
                if (result.triggered) {
                    console.log('[booking] commission triggered:', { id, amount: result.amount })
                }
            } else {
                console.log('[booking] paid status reached but no amount set — skipping commission trigger')
            }
        } catch (commissionErr: any) {
            console.error('[booking] commission trigger failed:', commissionErr?.message)
        }
    }

    // Best-effort customer status email via Zoho-primary / Resend-fallback helper.
    let notify: { sent: boolean; error?: string; provider?: 'zoho' | 'resend' } | undefined
    if (booking && willNotifyCustomer) {
        try {
            if (booking.email) {
                const subject = subjectForStatus(status, booking)
                const body = buildClientStatusUpdateBody(booking, status)
                if (subject && body) {
                    const result = await sendTransactionalEmail({
                        to: booking.email,
                        subject,
                        content: body,
                    })
                    notify = result.success
                        ? { sent: true, provider: result.provider }
                        : { sent: false, error: result.error || 'send failed', provider: result.provider }
                }
            }
        } catch (notifyErr: any) {
            console.warn('[BookingAdminUpdate] notify failed:', notifyErr?.message)
            notify = { sent: false, error: notifyErr?.message || String(notifyErr) }
        }
    }

    return res.status(200).json({ success: true, notify })
}

function subjectForStatus(status: string, booking: any): string | null {
    const eventType = booking.event_type || 'shoot'
    switch (status) {
        case 'confirmed': return `Your ${eventType} is confirmed — TLAU`
        case 'declined': return `About your booking request — TLAU`
        case 'cancelled': return `Your ${eventType} booking has been cancelled — TLAU`
        default: return null
    }
}

function buildClientStatusUpdateBody(booking: any, status: string): string {
    const firstName = (booking.name || '').split(' ')[0] || 'there'
    const eventType = booking.event_type || 'shoot'
    const dateLine = booking.event_date ? formatEventDate(booking.event_date) : 'the requested date'
    const adminNote = booking.admin_notes
        ? `<p style="color:#fff !important;font-size:14px;line-height:1.6;margin:16px 0 0 0;"><i>${escapeHtml(booking.admin_notes)}</i></p>`
        : ''

    if (status === 'confirmed') {
        return `
            <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 16px 0;letter-spacing:0.05em;">YOU'RE BOOKED</h1>
            <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 12px 0;">
                Hey ${escapeHtml(firstName)} — your ${escapeHtml(eventType)} on
                <b>${escapeHtml(dateLine)}</b> is confirmed. An invoice with the
                deposit and balance details is on its way separately.
            </p>
            ${adminNote}
            <p style="color:#fff !important;font-size:14px;margin:32px 0 0 0;">— Joshua / TLAU</p>
        `
    }
    if (status === 'declined') {
        return `
            <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 16px 0;letter-spacing:0.05em;">ABOUT YOUR REQUEST</h1>
            <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 12px 0;">
                Hey ${escapeHtml(firstName)} — thanks for reaching out about
                ${escapeHtml(dateLine)}. Unfortunately I'm not able to take this
                one on. If timing or scope shifts, please feel welcome to reach
                back out.
            </p>
            ${adminNote}
            <p style="color:#fff !important;font-size:14px;margin:32px 0 0 0;">— Joshua / TLAU</p>
        `
    }
    if (status === 'cancelled') {
        return `
            <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 16px 0;letter-spacing:0.05em;">BOOKING CANCELLED</h1>
            <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 12px 0;">
                Hey ${escapeHtml(firstName)} — your ${escapeHtml(eventType)}
                booking on ${escapeHtml(dateLine)} has been cancelled.
            </p>
            ${adminNote}
            <p style="color:#fff !important;font-size:14px;margin:32px 0 0 0;">— Joshua / TLAU</p>
        `
    }
    return ''
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
