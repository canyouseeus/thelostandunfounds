/**
 * The key for Stripe's money-management (Treasury v2) APIs: financial account
 * balances, received credits, and top-ups out of a financial account.
 *
 * Since 2026-11-05 Stripe refuses full-access secret keys on these APIs ("Full
 * access secret keys aren't allowed for this API. Create a new key with limited
 * access permissions instead."). The owner creates a RESTRICTED key in the
 * Stripe dashboard and sets it in Vercel as STRIPE_MONEY_KEY. Until then this
 * falls back to STRIPE_SECRET_KEY, which keeps failing with that message —
 * shown on the admin Money In / Out panel, never swallowed.
 */
export function stripeMoneyKey(): string {
  const key = process.env.STRIPE_MONEY_KEY || process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_MONEY_KEY / STRIPE_SECRET_KEY not configured')
  return key
}

/** Turn Stripe's "full access keys aren't allowed" refusal into the fix. */
export function explainMoneyKeyError(message: string): string {
  return /full access secret keys aren't allowed/i.test(message) && !process.env.STRIPE_MONEY_KEY
    ? 'Stripe needs a restricted key for financial accounts: add STRIPE_MONEY_KEY in Vercel'
    : message
}
