/**
 * Audience-measurement visitor identifier.
 *
 * This is the identifier that makes "unique visitors" mean anything on the
 * admin Site Analytics dashboard. It is deliberately built to sit inside the
 * first-party audience-measurement exemption that CNIL and several other EU
 * DPAs recognise, so that it needs no consent banner:
 *
 *   - strictly first-party — never sent to a third party, never sold, never
 *     shared, and no ad or retargeting network exists anywhere in this app;
 *   - not cross-site — scoped to this origin's localStorage, so it cannot
 *     follow anyone anywhere else;
 *   - used only for aggregate audience measurement, never to build a profile
 *     or to change what an individual visitor is shown;
 *   - and, the part that used to be missing, it EXPIRES.
 *
 * The original implementation (inline in Layout.tsx) minted a UUID once and
 * kept it forever. A permanent identifier is the single condition that pushes
 * this out of the exemption and into "you need consent for that" — so the
 * lifetime cap below is not cosmetic, it is the whole reason no banner is
 * required for analytics.
 */

/**
 * 13 months, the ceiling CNIL applies to audience-measurement identifiers.
 * Past this the identifier is discarded and a fresh, unrelated one is minted;
 * the old one cannot be linked to the new one.
 */
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000

const ID_KEY = 'tlau_visitor_id'
const ISSUED_KEY = 'tlau_visitor_id_issued'

function mint(): string {
  // randomUUID needs a secure context; fall back rather than throw on http://
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/**
 * Return the current visitor identifier, rotating it if it has aged out.
 * Returns null if storage is unavailable — callers should simply omit the
 * identifier rather than fall back to anything more persistent.
 */
export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const existing = localStorage.getItem(ID_KEY)
    const issuedRaw = localStorage.getItem(ISSUED_KEY)
    const issued = issuedRaw ? Number(issuedRaw) : NaN
    const now = Date.now()

    const fresh =
      existing &&
      Number.isFinite(issued) &&
      issued > 0 &&
      // A timestamp in the future means a clock change or tampering. Treat it
      // as expired: re-minting is harmless, honouring it could mean an
      // identifier that outlives the cap by years.
      issued <= now &&
      now - issued < MAX_AGE_MS

    if (fresh) return existing

    const id = mint()
    localStorage.setItem(ID_KEY, id)
    localStorage.setItem(ISSUED_KEY, String(now))
    return id
  } catch {
    // Private mode / storage disabled. No identifier, no page-view dedup —
    // the view is still counted, just not attributed to a returning visitor.
    return null
  }
}
