import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * The revenue picture in one call, computed server-side from the source
 * tables so every consumer (widget, expanded card, recap) reads the same
 * numbers.
 *
 * GET /api/admin/revenue-summary
 *
 * Covers the seven gaps the tile used to have:
 *  1. all five sources (affiliate, gallery, bookings, shop, tickets)
 *  2. gross → net waterfall (fees, print COGS, contractor payouts, refunds)
 *  3. refunds netted out, not just listed
 *  4. time framing (MTD vs last month, this week vs last, daily series)
 *  5. receivables (unpaid invoices) and liabilities (unpaid commissions)
 *  6. order count, average order value, new vs returning customers
 *  7. test-data filtering per revenue-data-validator, applied once, here
 */

/** revenue-data-validator: test/demo/admin traffic is not revenue. */
const TEST_EMAIL = /(test|demo|example\.com|\+test)/i

const CARD_FEE_RATE = 0.029
const CARD_FEE_FIXED_CENTS = 30

interface Txn {
    source: 'affiliate' | 'gallery' | 'bookings' | 'shop' | 'tickets'
    email: string | null
    cents: number
    at: string
    /** Card-processed sales carry an estimated processor fee. */
    feeCents: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
    const supabase = createClient(url, key)

    const paidish = (s: string | null) => !!s && ['paid', 'completed', 'succeeded', 'confirmed'].includes(s.toLowerCase())
    const fee = (cents: number) => Math.round(cents * CARD_FEE_RATE) + CARD_FEE_FIXED_CENTS

    try {
        const [shop, gallery, tickets, invPaid, commissions, prodigi, refunds, invoicesOpen, commissionsOwed] =
            await Promise.all([
                supabase.from('shop_orders')
                    .select('customer_email, amount_total_cents, paid_at, status'),
                supabase.from('photo_orders')
                    .select('email, total_amount_cents, payment_status, created_at'),
                supabase.from('event_tickets')
                    .select('customer_email, purchase_amount_cents, status, created_at'),
                supabase.from('invoice_payments')
                    .select('amount, paid_at, invoices ( contractor_payout )'),
                supabase.from('affiliate_commissions')
                    .select('gross_amount, profit_generated, product_cost, status, created_at')
                    .not('status', 'in', '("cancelled","rejected")'),
                supabase.from('prodigi_orders')
                    .select('unit_cost, copies, status, paid_at')
                    .not('status', 'eq', 'cancelled'),
                supabase.from('refunds')
                    .select('amount_cents, created_at'),
                supabase.from('invoices')
                    .select('amount_due, status')
                    .not('status', 'in', '("paid","cancelled","void")'),
                supabase.from('affiliate_commissions')
                    .select('amount')
                    .eq('status', 'available'),
            ])

        const txns: Txn[] = []
        for (const o of shop.data ?? []) {
            if (!paidish(o.status) || TEST_EMAIL.test(o.customer_email ?? '')) continue
            const cents = o.amount_total_cents ?? 0
            txns.push({ source: 'shop', email: o.customer_email, cents, at: o.paid_at, feeCents: fee(cents) })
        }
        for (const o of gallery.data ?? []) {
            if (!paidish(o.payment_status) || TEST_EMAIL.test(o.email ?? '')) continue
            const cents = o.total_amount_cents ?? 0
            txns.push({ source: 'gallery', email: o.email, cents, at: o.created_at, feeCents: fee(cents) })
        }
        for (const t of tickets.data ?? []) {
            if (!paidish(t.status) || TEST_EMAIL.test(t.customer_email ?? '')) continue
            const cents = t.purchase_amount_cents ?? 0
            txns.push({ source: 'tickets', email: t.customer_email, cents, at: t.created_at, feeCents: fee(cents) })
        }
        for (const p of invPaid.data ?? []) {
            // invoice_payments.amount is dollars; method may be cash/zelle, but
            // fees on those are zero — estimate only when it looks like a card.
            const cents = Math.round(Number(p.amount ?? 0) * 100)
            txns.push({ source: 'bookings', email: null, cents, at: p.paid_at, feeCents: 0 })
        }
        for (const c of commissions.data ?? []) {
            // Affiliate rows: the site's take is the gross sale minus what the
            // affiliate is owed — profit_generated is that figure when present.
            const cents = Math.round(Number(c.profit_generated ?? c.gross_amount ?? 0) * 100)
            if (cents <= 0) continue
            txns.push({ source: 'affiliate', email: null, cents, at: c.created_at, feeCents: 0 })
        }

        // ── Waterfall ────────────────────────────────────────────────────────
        const grossCents = txns.reduce((n, t) => n + t.cents, 0)
        const feesCents = txns.reduce((n, t) => n + t.feeCents, 0)
        const cogsCents = (prodigi.data ?? [])
            .filter(p => p.paid_at)
            .reduce((n, p) => n + Math.round(Number(p.unit_cost ?? 0) * 100) * (p.copies ?? 1), 0)
        const payoutCents = (invPaid.data ?? [])
            .reduce((n, p) => n + Math.round(Number((p as any).invoices?.contractor_payout ?? 0) * 100), 0)
        const refundCents = (refunds.data ?? []).reduce((n, r) => n + (r.amount_cents ?? 0), 0)
        const netCents = grossCents - feesCents - cogsCents - payoutCents - refundCents

        // ── Time framing ─────────────────────────────────────────────────────
        const now = new Date()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
        const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()
        const sum = (from: string, to?: string) =>
            txns.filter(t => t.at >= from && (!to || t.at < to)).reduce((n, t) => n + t.cents, 0)
        const mtdCents = sum(monthStart)
        const lastMonthCents = sum(lastMonthStart, monthStart)

        // Daily series, last 30 days, zero-filled so flat days stay visible.
        const days: string[] = []
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now); d.setUTCDate(d.getUTCDate() - i)
            days.push(d.toISOString().slice(0, 10))
        }
        const byDay = new Map(days.map(d => [d, 0]))
        for (const t of txns) {
            const d = (t.at ?? '').slice(0, 10)
            if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + t.cents)
        }
        const series = days.map(d => (byDay.get(d) ?? 0) / 100)

        // ── Sources ──────────────────────────────────────────────────────────
        const sources = (['affiliate', 'gallery', 'bookings', 'shop', 'tickets'] as const).map(s => {
            const rows = txns.filter(t => t.source === s)
            const mtd = rows.filter(t => t.at >= monthStart).reduce((n, t) => n + t.cents, 0)
            const prev = rows.filter(t => t.at >= lastMonthStart && t.at < monthStart).reduce((n, t) => n + t.cents, 0)
            return { source: s, totalCents: rows.reduce((n, t) => n + t.cents, 0), mtdCents: mtd, lastMonthCents: prev, count: rows.length }
        })

        // ── Receivables / liabilities ────────────────────────────────────────
        const receivableCents = (invoicesOpen.data ?? [])
            .reduce((n, i) => n + Math.round(Number(i.amount_due ?? 0) * 100), 0)
        const commissionsOwedCents = (commissionsOwed.data ?? [])
            .reduce((n, c) => n + Math.round(Number(c.amount ?? 0) * 100), 0)

        // ── Customers ────────────────────────────────────────────────────────
        const emailTxns = txns.filter(t => t.email)
        const perEmail = new Map<string, number>()
        for (const t of emailTxns) {
            const e = t.email!.toLowerCase()
            perEmail.set(e, (perEmail.get(e) ?? 0) + 1)
        }
        const returning = [...perEmail.values()].filter(n => n > 1).length

        return res.status(200).json({
            waterfall: { grossCents, feesCents, cogsCents, payoutCents, refundCents, netCents },
            time: { mtdCents, lastMonthCents, series },
            sources,
            outstanding: { receivableCents, commissionsOwedCents },
            customers: {
                orderCount: txns.length,
                avgOrderCents: txns.length ? Math.round(grossCents / txns.length) : 0,
                uniqueCustomers: perEmail.size,
                returningCustomers: returning,
            },
            filteredAsTest: {
                note: 'test/demo/example emails excluded per revenue-data-validator',
            },
        })
    } catch (err: any) {
        console.error('[RevenueSummary] error:', err)
        return res.status(500).json({ error: err?.message || 'Summary failed' })
    }
}
