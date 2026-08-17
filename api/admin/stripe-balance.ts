import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js'

/**
 * Report the Stripe balance, the payout schedule and recent bank payouts.
 *
 * Contractor payouts move money with `transfers.create`, which spends the
 * platform's **available** balance. A client can therefore pay in full while
 * that balance stays at zero, and the payout silently skips as
 * `insufficient_balance` — which reads as "the money has not settled yet" and
 * is indistinguishable from the case where the money settled and was then
 * swept to the bank by Stripe's automatic payouts.
 *
 * That is not a distinction anyone should have to guess at: one resolves
 * itself in a day, the other never resolves and the contractor is never paid.
 * This shows which it is — available versus pending, and whether automatic
 * payouts are draining the balance before transfers can use it.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true
  }
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

const usd = (cents: number) => Math.round(cents) / 100

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const stripe = getStripe()

    const balance = await stripe.balance.retrieve()
    const pick = (arr: any[] | undefined) => {
      const row = (arr || []).find((b: any) => b.currency === 'usd')
      return row ? usd(row.amount) : 0
    }

    const account = await stripe.accounts.retrieve(undefined as any)
    const schedule = (account as any)?.settings?.payouts?.schedule || null

    const payouts = await stripe.payouts.list({ limit: 5 })
    const charges = await stripe.charges.list({ limit: 5 })

    return res.status(200).json({
      balance: {
        available: pick(balance.available),
        pending: pick((balance as any).pending),
        instantAvailable: pick((balance as any).instant_available),
      },
      // If interval is 'daily'/'weekly', Stripe sweeps the balance to the bank
      // on its own, and a transfer scheduled after the sweep finds nothing.
      payoutSchedule: schedule,
      recentBankPayouts: payouts.data.map(p => ({
        id: p.id,
        amount: usd(p.amount),
        status: p.status,
        arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
        created: new Date(p.created * 1000).toISOString(),
      })),
      recentCharges: charges.data.map(c => ({
        id: c.id,
        amount: usd(c.amount),
        status: c.status,
        captured: c.captured,
        created: new Date(c.created * 1000).toISOString(),
        description: c.description,
      })),
    })
  } catch (err: any) {
    console.error('[stripe-balance] failed:', err)
    return res.status(500).json({ error: err?.message || 'Balance lookup failed' })
  }
}
