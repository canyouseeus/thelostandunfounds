import type Stripe from 'stripe'
import { getStripe } from '../affiliates/_stripe-client.js'

/**
 * Money that leaves through Stripe without the site writing a row for it.
 *
 *  - Business card spending (Stripe Issuing): every capture is money out,
 *    every refund on the card brings it back. Sorted into a category from the
 *    merchant's category code, so it can be read without anyone logging it.
 *  - Stripe's own charges: the processing fee on each card payment (the real
 *    fee from the balance transaction, not an estimate), monthly Connect and
 *    Issuing billing, and Climate contributions.
 *  - Connect transfers: affiliate commissions and the owner's 10%. Crew job
 *    payouts are skipped, because the ledger already counts each invoice's
 *    contractor_payout; counting the transfer too would double them.
 *
 * Payouts into the platform's own financial accounts and top-ups back out of
 * them are moves between our own pockets, not spending, so they are ignored.
 */

export interface StripeLine {
  /** YYYY-MM-DD, UTC, like every other date in the ledger summary. */
  day: string
  category: string
  /** Positive is money out. Negative is money coming back (a card refund, a reversal). */
  cents: number
  label: string
}

export interface CardSpend {
  id: string
  day: string
  merchant: string
  category: string
  cents: number
}

/** How many of each list to read. The account has well under this today. */
const MAX_ROWS = 2000

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10)

/** Website infrastructure the business pays for, by merchant name. */
const WEBSITE_MERCHANTS = /(vercel|supabase|zoho|github|cloudflare|netlify|namecheap|godaddy|squarespace|google \*?(workspace|gsuite|cloud)|resend)/i

/**
 * A card purchase's category, from its merchant category code (ISO 18245).
 * The mapping is a best guess at what the purchase was for; the merchant name
 * is shown beside it so a wrong guess is easy to spot.
 */
export function cardCategory(mcc: string | null | undefined, merchant: string): string {
  if (WEBSITE_MERCHANTS.test(merchant)) return 'website'
  const code = Number(mcc)
  if ([4816, 5734, 5817, 5818, 7372, 7379].includes(code)) return 'software'
  if ([5044, 5045, 5732, 5946].includes(code)) return 'gear'
  if ([5411, 5422, 5441, 5451, 5462, 5499, 5811, 5812, 5813, 5814].includes(code)) return 'food'
  if ((code >= 3000 && code <= 3999) || [4011, 4111, 4112, 4121, 4131, 4411, 4511, 4582, 4784, 4789, 5541, 5542, 7011, 7512, 7523, 7999].includes(code)) return 'travel'
  if ([7311, 7333, 7338].includes(code)) return 'marketing'
  if ([5111, 5200, 5251, 5310, 5311, 5331, 5399, 5942, 5943, 5999].includes(code)) return 'supplies'
  return 'other'
}

async function listAll<T>(page: Stripe.ApiListPromise<T>): Promise<T[]> {
  const out: T[] = []
  for await (const row of page) {
    out.push(row)
    if (out.length >= MAX_ROWS) break
  }
  return out
}

export async function stripeMoneyOut(ownerAccountId: string | null): Promise<{
  lines: StripeLine[]
  cardSpend: CardSpend[]
}> {
  const stripe = getStripe()
  const [issuing, balanceTxns, transfers] = await Promise.all([
    listAll(stripe.issuing.transactions.list({ limit: 100 })),
    listAll(stripe.balanceTransactions.list({ limit: 100 })),
    listAll(stripe.transfers.list({ limit: 100 })),
  ])

  const lines: StripeLine[] = []
  const cardSpend: CardSpend[] = []

  for (const t of issuing) {
    if (t.currency !== 'usd' || !t.amount) continue
    const merchant = t.merchant_data?.name?.trim() || 'Card purchase'
    const category = cardCategory(t.merchant_data?.category_code, merchant)
    // Issuing amounts are negative for a purchase and positive for a refund.
    const cents = -t.amount
    lines.push({ day: day(t.created), category, cents, label: merchant })
    cardSpend.push({ id: t.id, day: day(t.created), merchant, category, cents })
  }

  for (const b of balanceTxns) {
    if (b.currency !== 'usd') continue
    if ((b.type === 'charge' || b.type === 'payment') && b.fee > 0) {
      lines.push({ day: day(b.created), category: 'fees', cents: b.fee, label: 'Card processing fee' })
    } else if (b.type === 'stripe_fee' && b.amount < 0) {
      lines.push({ day: day(b.created), category: 'fees', cents: -b.amount, label: b.description || 'Stripe fee' })
    } else if (b.type === 'contribution' && b.amount < 0) {
      lines.push({ day: day(b.created), category: 'fees', cents: -b.amount, label: 'Stripe Climate contribution' })
    } else if (b.reporting_category === 'dispute' && b.amount < 0) {
      lines.push({ day: day(b.created), category: 'refunds', cents: -b.amount, label: 'Card dispute' })
    }
  }

  for (const tr of transfers) {
    if (tr.currency !== 'usd') continue
    const meta = tr.metadata || {}
    if (meta.kind === 'crew_job_payout') continue
    const cents = tr.amount - (tr.amount_reversed || 0)
    if (cents <= 0) continue
    const category = meta.affiliate_code
      ? 'commissions'
      : /^owner pay/i.test(tr.description || '') || (ownerAccountId && tr.destination === ownerAccountId)
        ? 'owner_pay'
        : 'other'
    lines.push({ day: day(tr.created), category, cents, label: tr.description || 'Stripe transfer' })
  }

  cardSpend.sort((a, b) => b.day.localeCompare(a.day))
  return { lines, cardSpend }
}
