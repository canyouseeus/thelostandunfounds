import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js'

import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
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


const usd = (cents: number) => Math.round(cents) / 100

/** The platform's storage financial accounts, named the way the owner knows them. */
const ACCOUNT_LABELS: Record<string, string> = {
  fa_65UbOiP49XIyCjVLt9w16UbOGOJESQ1Wd0tevkXEB3w5km: 'Business',
  fa_65Vc0ZpAuxheTRvd98q16UbOGOJESQ1Wd0tevkXEB3wDSi: 'King Midas pot',
  fa_65Vc0ZPs07Y7q1ibQPv16UbOGOJESQ1Wd0tevkXEB3wOEa: 'Secret Santa',
  fa_65Vc0aUTLSwK4YumRSn16UbOGOJESQ1Wd0tevkXEB3wPCa: 'Affiliate pay',
}

/** Every open financial account (Treasury v2) with its USD balance. */
async function financialAccounts() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  const res = await fetch('https://api.stripe.com/v2/money_management/financial_accounts?limit=20', {
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2026-09-30.preview' },
  })
  const body: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Stripe financial accounts: ${body?.error?.message || res.status}`)
  const val = (side: any) => usd(side?.usd?.value ?? 0)
  return (body.data ?? [])
    .filter((fa: any) => fa.status === 'open')
    .map((fa: any) => ({
      id: fa.id,
      name: ACCOUNT_LABELS[fa.id] || fa.display_name || 'Financial account',
      available: val(fa.balance?.available),
      inboundPending: val(fa.balance?.inbound_pending),
      outboundPending: val(fa.balance?.outbound_pending),
    }))
    .sort((a: any, b: any) => (a.name === 'Business' ? -1 : b.name === 'Business' ? 1 : a.name.localeCompare(b.name)))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

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

    // A Treasury hiccup must not hide the Payments balance.
    let accounts: any[] = []
    let accountsError: string | null = null
    try { accounts = await financialAccounts() } catch (e: any) { accountsError = e?.message || 'lookup failed' }

    return res.status(200).json({
      financialAccounts: accounts,
      financialAccountsError: accountsError,
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
