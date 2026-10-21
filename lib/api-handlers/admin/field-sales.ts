import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_booking-payment-utils.js'
import { verifyAdmin } from '../_admin-auth.js'

/**
 * Street nights — /api/admin/field-sales
 *
 * GET  → the last 30 nights, each with its owner-pay job's status.
 * POST { night, location?, cashApp?, venmo?, applePay?, cash?, saleCount?, notes? }
 *      → records the night as revenue and queues the owner's pay.
 *
 * Owner decisions, 2026-10-20: walk-up sales are plain business revenue (no
 * affiliate, King Midas or Secret Santa share); the owner is paid 10% of the
 * night to his Stripe Connect account; the business keeps 90%. The pay runs
 * as an `owner_pay` admin job, which checks the available Stripe balance
 * first and waits for funds rather than failing.
 */

export const OWNER_PAY_RATE = 0.10

const toMoney = (n: number) => Math.round(n * 100) / 100

export class FieldSaleInputError extends Error {
  status = 400
}

function amount(body: Record<string, any>, key: string): number {
  const raw = body[key]
  if (raw === undefined || raw === null || raw === '') return 0
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) throw new FieldSaleInputError(`${key} must be a non-negative number`)
  return toMoney(n)
}

export async function recordFieldSale(supabase: SupabaseClient, body: Record<string, any>) {
  const night = String(body.night || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) throw new FieldSaleInputError('night must be YYYY-MM-DD')

  const parts = {
    cash_app: amount(body, 'cashApp'),
    venmo: amount(body, 'venmo'),
    apple_pay: amount(body, 'applePay'),
    cash: amount(body, 'cash'),
  }
  const total = toMoney(parts.cash_app + parts.venmo + parts.apple_pay + parts.cash)
  if (total <= 0) throw new FieldSaleInputError('Enter at least one amount')

  const saleCount = body.saleCount === undefined || body.saleCount === '' || body.saleCount === null
    ? null
    : Number(body.saleCount)
  if (saleCount !== null && !(Number.isInteger(saleCount) && saleCount >= 0)) {
    throw new FieldSaleInputError('saleCount must be a whole number')
  }

  const ownerPay = toMoney(total * OWNER_PAY_RATE)

  const { data: sale, error } = await supabase
    .from('field_sales')
    .insert({
      night,
      location: body.location ? String(body.location).slice(0, 200) : null,
      ...parts,
      sale_count: saleCount,
      owner_pay: ownerPay,
      notes: body.notes ? String(body.notes).slice(0, 1000) : null,
    })
    .select()
    .single()
  if (error) throw new Error(`Could not record the night: ${error.message}`)

  let payJob: { id: string; status: string } | null = null
  if (ownerPay > 0) {
    const { data: job, error: jobErr } = await supabase
      .from('admin_jobs')
      .insert({
        action: 'owner_pay',
        payload: { fieldSaleId: sale.id, amount: ownerPay },
        requested_by: 'field-sales',
        note: `Owner pay, street night ${night}${sale.location ? ` (${sale.location})` : ''}`,
        idempotency_key: `field-sale-pay-${sale.id}`,
      })
      .select('id, status')
      .single()
    if (jobErr) throw new Error(`Night recorded, but the pay could not be queued: ${jobErr.message}`)
    payJob = job
    await supabase.from('field_sales').update({ owner_pay_job_id: job.id }).eq('id', sale.id)
  }

  return { sale: { ...sale, owner_pay_job_id: payJob?.id ?? null }, total, ownerPay, businessKeeps: toMoney(total - ownerPay), payJob }
}

export async function listFieldSales(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('field_sales')
    .select('*, pay:owner_pay_job_id ( status, error, result )')
    .order('night', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return data || []
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const supabase = getSupabaseAdmin()
    if (req.method === 'GET') return res.status(200).json({ nights: await listFieldSales(supabase) })
    if (req.method === 'POST') return res.status(200).json(await recordFieldSale(supabase, req.body || {}))
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    if (err instanceof FieldSaleInputError) return res.status(err.status).json({ error: err.message })
    console.error('[field-sales] failed:', err)
    return res.status(500).json({ error: err?.message || 'Field sale failed' })
  }
}
