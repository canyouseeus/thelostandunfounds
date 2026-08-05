import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Daily business recap for the master calendar's day view.
 *
 * GET /api/calendar/recap?date=YYYY-MM-DD
 *
 * Returns every sale that landed on the date — shop orders, gallery orders,
 * event tickets, invoice payments — each with its source, customer, amount,
 * and where to follow it (the invoice, the CRM contact, the payment intent),
 * plus the day's deployments so the business record and the code record sit
 * on the same page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const date = String(req.query.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' })
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    // Whole-day window in UTC. The timestamps in these tables are UTC; a sale
    // near midnight can land on the neighbouring day from the admin's local
    // point of view, which is a known trade-off of keeping the boundary simple.
    const dayStart = `${date}T00:00:00Z`
    const dayEnd = `${date}T23:59:59.999Z`

    interface Sale {
        source: 'shop' | 'gallery' | 'tickets' | 'invoice'
        customerName: string | null
        customerEmail: string | null
        amountCents: number
        occurredAt: string
        /** Reference for the money trail: payment intent / order id / invoice number. */
        reference: string | null
        invoiceId: string | null
        invoiceNumber: string | null
        crmContactId: string | null
    }

    try {
        const [shop, gallery, tickets, invoicePayments, deployments] = await Promise.all([
            supabase
                .from('shop_orders')
                .select('id, customer_email, amount_total_cents, stripe_payment_intent, paid_at, status')
                .gte('paid_at', dayStart).lte('paid_at', dayEnd),
            supabase
                .from('photo_orders')
                .select('id, email, total_amount_cents, paypal_order_id, payment_status, created_at')
                .gte('created_at', dayStart).lte('created_at', dayEnd),
            supabase
                .from('event_tickets')
                .select('id, customer_name, customer_email, purchase_amount_cents, payment_intent_id, status, created_at')
                .gte('created_at', dayStart).lte('created_at', dayEnd),
            supabase
                .from('invoice_payments')
                .select('id, amount, method, paid_at, invoices ( id, invoice_number, client_id )')
                .gte('paid_at', dayStart).lte('paid_at', dayEnd),
            supabase
                .from('deployments')
                .select('vercel_deployment_id, status, commit_sha, commit_message, url, created_at')
                .gte('created_at', dayStart).lte('created_at', dayEnd)
                .order('created_at', { ascending: true }),
        ])

        const paidish = (s: string | null) => !!s && ['paid', 'completed', 'succeeded', 'confirmed'].includes(s.toLowerCase())

        const sales: Sale[] = []
        for (const o of shop.data ?? []) {
            if (!paidish(o.status)) continue
            sales.push({
                source: 'shop', customerName: null, customerEmail: o.customer_email,
                amountCents: o.amount_total_cents ?? 0, occurredAt: o.paid_at,
                reference: o.stripe_payment_intent, invoiceId: null, invoiceNumber: null, crmContactId: null,
            })
        }
        for (const o of gallery.data ?? []) {
            if (!paidish(o.payment_status)) continue
            sales.push({
                source: 'gallery', customerName: null, customerEmail: o.email,
                amountCents: o.total_amount_cents ?? 0, occurredAt: o.created_at,
                reference: o.paypal_order_id, invoiceId: null, invoiceNumber: null, crmContactId: null,
            })
        }
        for (const t of tickets.data ?? []) {
            if (!paidish(t.status)) continue
            sales.push({
                source: 'tickets', customerName: t.customer_name, customerEmail: t.customer_email,
                amountCents: t.purchase_amount_cents ?? 0, occurredAt: t.created_at,
                reference: t.payment_intent_id, invoiceId: null, invoiceNumber: null, crmContactId: null,
            })
        }
        for (const p of invoicePayments.data ?? []) {
            const inv = (p as any).invoices
            sales.push({
                source: 'invoice', customerName: null, customerEmail: null,
                // invoice_payments.amount is in dollars; everything else is cents.
                amountCents: Math.round(Number(p.amount ?? 0) * 100), occurredAt: p.paid_at,
                reference: p.method, invoiceId: inv?.id ?? null, invoiceNumber: inv?.invoice_number ?? null,
                crmContactId: null,
            })
        }

        // Who do we already know? Match sale emails against the CRM so each row
        // can link straight to its contact; invoice payments match on client_id.
        const emails = [...new Set(sales.map(s => s.customerEmail).filter(Boolean))] as string[]
        if (emails.length > 0) {
            const { data: contacts } = await supabase
                .from('contacts').select('id, email, first_name, last_name').in('email', emails)
            const byEmail = new Map((contacts ?? []).map(c => [c.email?.toLowerCase(), c]))
            for (const s of sales) {
                const c = s.customerEmail ? byEmail.get(s.customerEmail.toLowerCase()) : undefined
                if (c) {
                    s.crmContactId = c.id
                    if (!s.customerName) s.customerName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null
                }
            }
        }
        const clientIds = [...new Set(
            (invoicePayments.data ?? []).map(p => (p as any).invoices?.client_id).filter(Boolean)
        )] as string[]
        if (clientIds.length > 0) {
            const { data: contacts } = await supabase
                .from('contacts').select('id, email, first_name, last_name').in('id', clientIds)
            const byId = new Map((contacts ?? []).map(c => [c.id, c]))
            for (const s of sales) {
                if (s.source !== 'invoice' || !s.invoiceId) continue
                const inv = (invoicePayments.data ?? []).find(p => (p as any).invoices?.id === s.invoiceId) as any
                const c = inv ? byId.get(inv.invoices.client_id) : undefined
                if (c) {
                    s.crmContactId = c.id
                    s.customerName = [c.first_name, c.last_name].filter(Boolean).join(' ') || null
                    s.customerEmail = c.email ?? null
                }
            }
        }

        sales.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1))

        return res.status(200).json({
            date,
            sales,
            totalCents: sales.reduce((n, s) => n + s.amountCents, 0),
            deployments: deployments.data ?? [],
        })
    } catch (err: any) {
        console.error('[CalendarRecap] error:', err)
        return res.status(500).json({ error: err?.message || 'Recap failed' })
    }
}
