/**
 * Referral tracking consent prompt.
 *
 * Deliberately NOT a site-wide cookie banner. Analytics on this site sits
 * inside the first-party audience-measurement exemption (see
 * utils/visitor-id.ts), so it needs no consent and no banner. The only storage
 * that does is affiliate attribution — which is written only for someone who
 * arrived on a `?ref=` link. So this prompt is doubly conditional:
 *
 *   1. the visitor is in the EU/UK/EEA/CH consent zone (per /api/geo), and
 *   2. they actually arrived on a referral link.
 *
 * In practice that is close to nobody, which is the point: the site stays
 * friction-free for everyone else instead of taxing 100% of visitors to cover
 * a case that applies to a handful.
 *
 * Styling follows the design skills: no borders, no shadows, no rounded
 * corners, uppercase labels, surface separation via bg tone + backdrop blur.
 * z-[9999] per modal-z-index-manager so it clears the z-50 header.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getConsentState,
  subscribeConsent,
  grantConsent,
  denyConsent,
  type ConsentState,
} from '../utils/consent'
import { hasPendingReferral } from '../utils/affiliate-tracking'

export default function CookieConsent() {
  const [state, setState] = useState<ConsentState>(getConsentState)
  const [referralSeen, setReferralSeen] = useState(hasPendingReferral)

  useEffect(() => subscribeConsent(setState), [])

  // hasPendingReferral() is set by initAffiliateTracking during the same mount
  // pass, which may land after our first render. Re-check on the next tick so
  // the prompt is not missed by a single frame of ordering.
  useEffect(() => {
    const id = window.setTimeout(() => setReferralSeen(hasPendingReferral()), 0)
    return () => window.clearTimeout(id)
  }, [state])

  if (state !== 'pending') return null
  if (!referralSeen) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] bg-black/95 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 text-left">
          <h2
            id="consent-heading"
            className="text-xs font-bold uppercase tracking-widest text-white mb-2"
          >
            Referral Tracking
          </h2>
          <p className="text-sm text-white/70 text-left">
            You arrived through a referral link. May we store a cookie for 30 days so the
            person who referred you gets credit if you buy something? We use it for nothing
            else, and we don&apos;t sell or share it. Declining does not change the site.{' '}
            <Link to="/docs/privacy" className="text-white underline hover:text-white/70">
              Privacy policy
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={denyConsent}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
            style={{ borderRadius: 0 }}
          >
            Decline
          </button>
          <button
            onClick={grantConsent}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
            style={{ borderRadius: 0 }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}
