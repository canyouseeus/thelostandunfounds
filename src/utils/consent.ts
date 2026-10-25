/**
 * Consent gate for marketing storage.
 *
 * ePrivacy Art. 5(3) makes the *act of writing to a visitor's device* the thing
 * that needs consent — not selling, not sharing, not whether the data is
 * personal. The only carve-out is storage "strictly necessary" for the service
 * the visitor actually asked for. So the question for each key we write is
 * narrow: does this serve the visitor, or us?
 *
 * Exactly one thing we store is gated here:
 *
 *   - `affiliate_ref` (+ `affiliate_subid`) — 30-day marketing attribution.
 *     Serves us and our affiliates, not the reader, and no audience-measurement
 *     exemption covers marketing attribution. It is also only ever written for
 *     someone who arrived on a `?ref=` link, so in practice this gate fires for
 *     almost nobody.
 *
 * Everything else is deliberately outside the gate:
 *
 *   - Supabase auth tokens — you cannot stay logged in without them.
 *   - `tlau_visitor_id` — analytics. Kept *inside* the first-party
 *     audience-measurement exemption that CNIL and other DPAs recognise, rather
 *     than consent-gated: strictly first-party, never shared, no cross-site
 *     tracking, and the identifier now expires (see utils/visitor-id.ts). Built
 *     that way precisely so it needs no banner.
 *   - `nl_done` — written *only* after a successful newsletter subscribe, i.e.
 *     after the visitor has already handed us an email address on purpose. The
 *     subscribe is the affirmative act; a cookie recording "don't ask this
 *     person again" honours it rather than tracking them.
 *   - `nl_dismissed` — sessionStorage, gone when the tab closes.
 *
 * The gate is deny-by-default: until we positively know a visitor is outside
 * the consent-required zone, or they have told us yes, `mayStoreNonEssential()`
 * is false. Resolution is one call to /api/geo, cached in localStorage so it
 * happens once per browser rather than once per page view.
 */

export type ConsentState =
  | 'pending'       // consent required, not yet answered — show the banner
  | 'granted'       // visitor said yes
  | 'denied'        // visitor said no
  | 'not-required'  // outside the EU/UK/EEA/CH zone
  | 'resolving'     // still asking /api/geo; store nothing yet

const DECISION_KEY = 'tlau_consent'

/**
 * Bump when the set of gated storage changes materially. A stored decision
 * carrying an older version is discarded and re-asked, so that consent granted
 * for one set of storage is never silently reused for a wider one.
 */
const DECISION_VERSION = 1

type StoredDecision = {
  v: number
  decision: 'granted' | 'denied' | 'not-required'
  at: string
}

let state: ConsentState = 'resolving'
const listeners = new Set<(s: ConsentState) => void>()

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(state)
    } catch {
      /* a broken listener must not take down the others */
    }
  })
}

function setState(next: ConsentState) {
  if (state === next) return
  state = next
  emit()
}

export function getConsentState(): ConsentState {
  return state
}

/**
 * The single question every non-essential write must ask first.
 */
export function mayStoreNonEssential(): boolean {
  return state === 'granted' || state === 'not-required'
}

export function subscribeConsent(fn: (s: ConsentState) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function readStoredDecision(): StoredDecision | null {
  try {
    const raw = localStorage.getItem(DECISION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDecision
    if (!parsed || parsed.v !== DECISION_VERSION) return null
    if (
      parsed.decision !== 'granted' &&
      parsed.decision !== 'denied' &&
      parsed.decision !== 'not-required'
    ) {
      return null
    }
    return parsed
  } catch {
    // Private-mode localStorage throws on access in some browsers. Treat an
    // unreadable store as "no decision recorded" rather than crashing the app.
    return null
  }
}

function writeStoredDecision(decision: StoredDecision['decision']) {
  try {
    localStorage.setItem(
      DECISION_KEY,
      JSON.stringify({ v: DECISION_VERSION, decision, at: new Date().toISOString() } as StoredDecision),
    )
  } catch {
    // If we cannot persist the decision we still honour it for this page load;
    // the visitor will simply be asked again next time.
  }
}

/**
 * Remove everything behind the gate. Called when a visitor declines, including
 * when they decline after previously having been tracked (they changed their
 * mind, or the decision version was bumped).
 */
export function purgeNonEssentialStorage() {
  try {
    // tlau_visitor_id is deliberately NOT purged here: it sits inside the
    // audience-measurement exemption and was never gated on this consent, so
    // removing it on decline would imply we had asked about it.
    localStorage.removeItem('affiliate_ref')
    localStorage.removeItem('affiliate_ref_timestamp')
    localStorage.removeItem('affiliate_subid')
  } catch {
    /* nothing we can do if storage is unavailable */
  }

  try {
    // Clear on the bare path and on the host + dot-host variants, mirroring
    // services/auth.ts: a cookie written under a different domain scope is not
    // removed by a path-only expiry, and would survive the purge.
    const kill = (name: string) => {
      const past = 'Thu, 01 Jan 1970 00:00:00 UTC'
      document.cookie = `${name}=; expires=${past}; path=/;`
      document.cookie = `${name}=; expires=${past}; path=/; domain=${window.location.hostname};`
      document.cookie = `${name}=; expires=${past}; path=/; domain=.${window.location.hostname};`
    }
    kill('affiliate_ref')
  } catch {
    /* ditto */
  }
}

export function grantConsent() {
  writeStoredDecision('granted')
  setState('granted')
}

export function denyConsent() {
  writeStoredDecision('denied')
  purgeNonEssentialStorage()
  setState('denied')
}

let initialised = false

/**
 * Resolve the gate once per page load. Safe to call more than once.
 */
export async function initConsent(): Promise<void> {
  if (typeof window === 'undefined') return
  if (initialised) return
  initialised = true

  const stored = readStoredDecision()
  if (stored) {
    setState(stored.decision)
    return
  }

  try {
    const res = await fetch('/api/geo')
    if (!res.ok) throw new Error(`geo lookup failed: ${res.status}`)
    const { consentRequired } = (await res.json()) as { consentRequired: boolean }

    if (consentRequired) {
      // Deliberately not persisted: "we must ask" is not an answer, and caching
      // it would leave the banner as the only thing that can resolve the gate.
      setState('pending')
    } else {
      writeStoredDecision('not-required')
      setState('not-required')
    }
  } catch {
    // Endpoint unreachable. Fail closed — ask rather than assume. The cost is a
    // banner shown to someone who may not have needed one; the cost of failing
    // open is writing an identifier we had no permission to write.
    setState('pending')
  }
}

/**
 * Test/debug helper: forget the stored decision and re-run resolution.
 * Not wired to any UI — used from the console when verifying the banner.
 */
export function resetConsentForTesting() {
  try {
    localStorage.removeItem(DECISION_KEY)
  } catch {
    /* ignore */
  }
  initialised = false
  setState('resolving')
  void initConsent()
}
