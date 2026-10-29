import Stripe from 'stripe'
import { createProdigiOrder } from './_prodigi-client.js'

/**
 * Prodigi fulfillment queue.
 *
 * Prodigi bills the card on the owner's Prodigi account the moment an order
 * is created. A customer's card payment does not reach the platform's Stripe
 * balance until Stripe settles it (usually ~2 business days, longer on a
 * newer account), so submitting from the payment webhook spends money the
 * business does not have yet.
 *
 * So the webhooks only mark a paid order `paid` and record when its money
 * frees up (`funds_available_at`). This queue — run hourly by
 * /api/cron/prodigi-orders — submits an order once:
 *  1. its own charge has settled (`funds_available_at` has passed), and
 *  2. for Stripe orders, the platform's *available* USD balance covers what
 *     the customer paid for it, net of orders already released this run.
 *
 * Strike (bitcoin) orders have no Stripe charge: the money is in Strike the
 * moment the invoice is PAID, so `funds_available_at` is the payment time and
 * the Stripe balance check does not apply to them.
 */

export interface ProdigiOrderRow {
    id: string
    payment_source: 'stripe' | 'strike'
    payment_ref: string
    shop_order_id?: string | null
    sku: string
    copies: number | null
    unit_price: number | string
    asset_url: string | null
    recipient: any
    order_attributes?: Record<string, string> | null
    funds_available_at?: string | null
}

function getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return null
    return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any, typescript: true })
}

/** What the customer paid for this order, in dollars. */
export function orderTotal(order: Pick<ProdigiOrderRow, 'unit_price' | 'copies'>): number {
    return Math.round(Number(order.unit_price) * (order.copies || 1) * 100) / 100
}

/**
 * When Stripe frees the money from a Checkout Session's charge (ISO), or null
 * when it cannot be read yet — the queue then looks again next run.
 */
export async function stripeFundsAvailableAt(sessionId: string): Promise<string | null> {
    try {
        const stripe = getStripe()
        if (!stripe) return null
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent.latest_charge.balance_transaction'],
        })
        const pi: any = session.payment_intent
        const txn = pi?.latest_charge?.balance_transaction
        const availableOn = typeof txn === 'object' ? txn?.available_on : null
        return availableOn ? new Date(availableOn * 1000).toISOString() : null
    } catch (err: any) {
        console.warn('⚠️ Could not read Stripe settlement for Prodigi order:', sessionId, err?.message)
        return null
    }
}

/** Available USD in the platform's Stripe balance, in dollars. */
async function availableUsd(stripe: Stripe): Promise<number> {
    const balance = await stripe.balance.retrieve()
    const cents = (balance.available || [])
        .filter((b) => b.currency === 'usd')
        .reduce((sum, b) => sum + b.amount, 0)
    return cents / 100
}

/**
 * Create the order at Prodigi (this is what bills the Prodigi card) and mark
 * the row submitted, or `error` with the reason. Idempotent at Prodigi via
 * idempotencyKey = row id.
 */
export async function submitProdigiOrder(supabase: any, order: ProdigiOrderRow) {
    try {
        const origin = process.env.SITE_URL || 'https://www.thelostandunfounds.com'
        const result = await createProdigiOrder({
            merchantReference: order.id,
            idempotencyKey: order.id,
            recipient: order.recipient,
            items: [
                {
                    sku: order.sku,
                    copies: order.copies || 1,
                    // fillPrintArea crops to the print area's aspect ratio;
                    // Prodigi auto-rotates the asset to whichever orientation
                    // needs the least cropping, so a landscape photo prints
                    // correctly on a portrait-shaped SKU (and vice versa)
                    // without us pre-rotating pixels ourselves.
                    sizing: 'fillPrintArea',
                    ...(order.order_attributes && Object.keys(order.order_attributes).length > 0
                        ? { attributes: order.order_attributes }
                        : {}),
                    assets: [{ printArea: 'default', url: order.asset_url as string }],
                },
            ],
            callbackUrl: `${origin.replace(/\/$/, '')}/api/prodigi/webhook`,
            metadata: { prodigiOrderRowId: order.id, ...(order.shop_order_id ? { shopOrderId: order.shop_order_id } : {}) },
        })

        await supabase
            .from('prodigi_orders')
            .update({
                status: 'submitted',
                prodigi_order_id: result?.order?.id || null,
                prodigi_status: result?.order?.status || null,
                submitted_at: new Date().toISOString(),
                error_message: null,
            })
            .eq('id', order.id)

        console.log('✅ Prodigi order submitted:', { rowId: order.id, prodigiOrderId: result?.order?.id })
        return { submitted: true as const, prodigiOrderId: result?.order?.id || null }
    } catch (prodigiErr: any) {
        const message = prodigiErr?.message || 'Prodigi submission failed'
        console.error('❌ Failed to submit Prodigi order:', order.id, message)
        // Surfaces to the admin print-orders view for a manual retry.
        await supabase
            .from('prodigi_orders')
            .update({ status: 'error', error_message: message })
            .eq('id', order.id)
        return { submitted: false as const, error: message }
    }
}

/**
 * Submit every paid order whose money has settled, oldest first. An order
 * that is not ready is left `paid` for the next run.
 */
export async function runProdigiSubmissions(supabase: any, options: { dryRun?: boolean } = {}) {
    const { data: queued, error } = await supabase
        .from('prodigi_orders')
        .select('*')
        .eq('status', 'paid')
        .order('paid_at', { ascending: true })
    if (error) throw error

    const results: Array<Record<string, unknown>> = []
    if (!queued?.length) return { checked: 0, submitted: 0, waiting: 0, failed: 0, results }

    const stripe = getStripe()
    let balance: number | null = null
    let submitted = 0
    let waiting = 0
    let failed = 0
    const now = Date.now()

    for (const order of queued as ProdigiOrderRow[]) {
        const total = orderTotal(order)

        let fundsAt = order.funds_available_at || null
        if (!fundsAt && order.payment_source === 'stripe') {
            fundsAt = await stripeFundsAvailableAt(order.payment_ref)
            if (fundsAt) {
                await supabase.from('prodigi_orders').update({ funds_available_at: fundsAt }).eq('id', order.id)
            }
        }
        if (!fundsAt || new Date(fundsAt).getTime() > now) {
            waiting++
            results.push({ id: order.id, total, waiting: 'charge_not_settled', fundsAvailableAt: fundsAt })
            continue
        }

        if (order.payment_source === 'stripe') {
            if (!stripe) {
                waiting++
                results.push({ id: order.id, total, waiting: 'stripe_not_configured' })
                continue
            }
            if (balance === null) balance = await availableUsd(stripe)
            if (total > balance) {
                waiting++
                results.push({ id: order.id, total, waiting: 'insufficient_balance', balance })
                continue
            }
        }

        if (options.dryRun) {
            results.push({ id: order.id, total, wouldSubmit: true })
            if (order.payment_source === 'stripe' && balance !== null) balance = Math.round((balance - total) * 100) / 100
            continue
        }

        // An overlapping run cannot double-order: Prodigi's idempotencyKey is
        // the row id, so a second create returns the first order.
        const outcome = await submitProdigiOrder(supabase, order)
        if (outcome.submitted) {
            submitted++
            if (order.payment_source === 'stripe' && balance !== null) balance = Math.round((balance - total) * 100) / 100
            results.push({ id: order.id, total, submitted: outcome.prodigiOrderId })
        } else {
            failed++
            results.push({ id: order.id, total, error: outcome.error })
        }
    }

    return { checked: queued.length, submitted, waiting, failed, balance, results }
}
