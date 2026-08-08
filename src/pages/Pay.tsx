import { siteUrl } from '../config/site'
/**
 * Pay Page
 *
 * A public, pay-what-you-want checkout. This is the only page on the site that
 * lets an anonymous visitor hand over money without first picking a product:
 * /shop is admin-gated and the native Stripe catalog is empty, so without this
 * there is no path for someone who simply wants to pay.
 *
 * It posts to /api/shop/payments/stripe, which builds a Checkout Session from
 * an inline price_data — no pre-created Stripe Price object is needed, so
 * amounts are arbitrary and nothing has to be seeded in the dashboard first.
 */

import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { getStripeCheckoutUrl } from '../utils/checkout-utils'

/** Stripe's own floor is $0.50; $1 keeps the fee from eating most of the payment. */
const MINIMUM_AMOUNT = 1

const PRESET_AMOUNTS = [1, 5, 25, 100]

export default function Pay() {
  const [selected, setSelected] = useState<number | 'custom'>(5)
  const [customAmount, setCustomAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = selected === 'custom' ? Number(customAmount) : selected
  const amountIsValid = Number.isFinite(amount) && amount >= MINIMUM_AMOUNT

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!amountIsValid) {
      setError(`Enter an amount of $${MINIMUM_AMOUNT} or more.`)
      return
    }

    setLoading(true)

    try {
      // The note rides along as the line-item description so it is readable in
      // the Stripe dashboard next to the payment.
      const trimmedNote = note.trim()
      const { url } = await getStripeCheckoutUrl({
        amount,
        currency: 'USD',
        description: trimmedNote
          ? `THE LOST+UNFOUNDS — ${trimmedNote}`
          : 'THE LOST+UNFOUNDS — Support',
      })

      // Hand off to Stripe's hosted checkout page.
      window.location.href = url
    } catch (err: any) {
      console.error('Payment failed to start:', err)
      setError(
        err?.message === 'Failed to fetch'
          ? 'Could not reach the payment service. Check your connection and try again.'
          : 'Something went wrong starting checkout. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>THE LOST+UNFOUNDS | Pay</title>
        <meta
          name="description"
          content="Support THE LOST+UNFOUNDS or settle an invoice. Pay any amount securely by card through Stripe."
        />
        <link rel="canonical" href={siteUrl('/pay')} />
      </Helmet>

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-white mb-4 uppercase tracking-tight">Pay</h1>
          <p className="text-lg text-white/70 text-left">
            Support the work, settle an invoice, or send whatever it's worth to
            you. Card payments are handled securely by Stripe — we never see your
            card details.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading} className="disabled:opacity-60 transition-opacity">
            <legend className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">
              Amount
            </legend>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {PRESET_AMOUNTS.map((preset) => {
                const isActive = selected === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelected(preset)
                      setError(null)
                    }}
                    aria-pressed={isActive}
                    className={`py-4 text-lg font-bold tracking-widest transition-colors ${
                      isActive
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    ${preset}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelected('custom')
                setError(null)
              }}
              aria-pressed={selected === 'custom'}
              className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-colors mb-3 ${
                selected === 'custom'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
              style={{ borderRadius: 0 }}
            >
              Custom Amount
            </button>

            {selected === 'custom' && (
              <div className="mb-3">
                <label htmlFor="custom-amount" className="sr-only">
                  Custom amount in US dollars
                </label>
                <div className="flex items-center bg-white/5">
                  <span className="pl-4 pr-1 text-xl font-bold text-white/50" aria-hidden="true">
                    $
                  </span>
                  <input
                    id="custom-amount"
                    type="number"
                    inputMode="decimal"
                    min={MINIMUM_AMOUNT}
                    step="0.01"
                    autoFocus
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      setError(null)
                    }}
                    placeholder={String(MINIMUM_AMOUNT)}
                    className="w-full bg-transparent py-4 pr-4 text-xl font-bold text-white placeholder:text-white/30 focus:outline-none"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <p className="mt-2 text-xs uppercase tracking-widest text-white/40 text-left">
                  Minimum ${MINIMUM_AMOUNT}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="note"
                className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-3"
              >
                Note <span className="text-white/30">(Optional)</span>
              </label>
              <input
                id="note"
                type="text"
                maxLength={120}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                className="w-full bg-white/5 py-4 px-4 text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                style={{ borderRadius: 0 }}
              />
            </div>

            {error && (
              <p role="alert" className="mb-4 bg-white/10 px-4 py-3 text-sm text-white text-left">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!amountIsValid || loading}
              className="w-full py-5 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderRadius: 0 }}
            >
              {loading
                ? 'Redirecting to Stripe…'
                : amountIsValid
                ? `Pay $${amount.toFixed(2)}`
                : `Enter $${MINIMUM_AMOUNT} or more`}
            </button>
          </fieldset>
        </form>

        <p className="mt-6 text-xs uppercase tracking-widest text-white/40 text-left">
          Secured by Stripe · Cards accepted worldwide
        </p>
      </div>
    </>
  )
}
