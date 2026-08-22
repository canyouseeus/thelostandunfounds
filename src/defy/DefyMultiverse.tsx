/**
 * DEFY MULTIVERSE — the whole player-facing site.
 *
 * Deliberately outside the LOST+UNFOUNDS design system: no Layout, no shared header,
 * no Noir. A universe that looks like PRIME is a failed universe.
 *
 * Identity is derived, never chosen: your email hashes to one of 2^64 addresses, and
 * the same address comes back forever. The only stored secret is an opaque token.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import './defy.css'

/**
 * Canonical for whichever host is serving. The vercel.json host rewrite means
 * defymultiverse.com/ and thelostandunfounds.com/defy are the same page, so a
 * hardcoded canonical is necessarily wrong on one of them. Self-reference instead.
 */
function canonicalHref(): string {
  if (typeof window === 'undefined') return 'https://www.thelostandunfounds.com/defy'
  return window.location.origin + window.location.pathname.replace(/\/$/, '') || window.location.origin
}

const TOKEN_KEY = 'defy.token'
const HEX = '0123456789ABCDEF'

interface Universe {
  address: string; name: string; designation: string
  constellationKey: string; constellationBlurb: string
  traits: Record<string, number>
  palette: { hue: number; accent: string; deep: string; wash: string }
  creed: string
}
interface Player { universe: Universe; score: number; streak: number; played: number; won: number }
interface Standing { index: number; key: string; universes: number; score: number }
interface State {
  day: string
  defiance: { id: string; prompt: string; optionA: string; optionB: string } | null
  yourChoice: 'a' | 'b' | null
  player: Player | null
  lastResolved: { prompt: string; option_a: string; option_b: string; count_a: number; count_b: number; minority: string | null; day: string } | null
  standings: { constellations: Standing[]; topUniverses: any[]; totalUniverses: number }
  primeUrl: string
}

const ANCHOR_AMOUNTS = [5, 15, 50]

export default function DefyMultiverse() {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  })
  const [state, setState] = useState<State | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pass, setPass] = useState(0)          // three passes of the reveal
  const [rolling, setRolling] = useState('')
  const [amount, setAmount] = useState(15)
  const [ln, setLn] = useState<{ invoiceId: string; lnInvoice: string } | null>(null)
  const [lnState, setLnState] = useState<'waiting' | 'paid'>('waiting')
  const rollTimer = useRef<number | null>(null)

  const universe = state?.player?.universe ?? null

  /* Paint the page in the player's own colours. */
  const vars = useMemo(() => (universe ? {
    ['--u-accent' as any]: universe.palette.accent,
    ['--u-deep' as any]: universe.palette.deep,
    ['--u-wash' as any]: universe.palette.wash,
  } : {}), [universe])

  const load = useCallback(async (t: string | null) => {
    try {
      const r = await fetch(`/api/defy/state${t ? `?token=${encodeURIComponent(t)}` : ''}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || `state failed (${r.status})`)
      setState(d)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  useEffect(() => { load(token) }, [load, token])

  /* Confirm an anchor payment on return from Stripe. */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const sid = p.get('session_id')
    if (!sid || !token) return
    fetch('/api/defy/anchor-confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, sessionId: sid }),
    }).finally(() => window.history.replaceState({}, '', '/defy'))
  }, [token])

  /* The three passes: address, constellation, creed. */
  const runReveal = useCallback((addr: string) => {
    setPass(1)
    let ticks = 0
    const spin = () => {
      ticks++
      if (ticks < 16) {
        setRolling(Array.from({ length: 16 }, () => HEX[Math.floor(Math.random() * 16)]).join(''))
        rollTimer.current = window.setTimeout(spin, 45)
      } else {
        setRolling(addr)
        window.setTimeout(() => setPass(2), 700)
        window.setTimeout(() => setPass(3), 1500)
      }
    }
    spin()
  }, [])

  useEffect(() => () => { if (rollTimer.current) clearTimeout(rollTimer.current) }, [])

  const enter = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      const r = await fetch('/api/defy/enter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Could not open a universe.')
      try { localStorage.setItem(TOKEN_KEY, d.token) } catch { /* private mode: session-only */ }
      runReveal(d.universe.address)
      setToken(d.token)
      await load(d.token)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const choose = async (c: 'a' | 'b') => {
    if (!token || state?.yourChoice) return
    setState(s => (s ? { ...s, yourChoice: c } : s))   // optimistic; server is authoritative
    try {
      const r = await fetch('/api/defy/choose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, choice: c }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Choice refused.')
      await load(token)
    } catch (e: any) {
      setError(e.message)
      await load(token)
    }
  }

  const anchor = async () => {
    if (!universe) return
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/shop/payments/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, currency: 'USD',
          description: `DEFY MULTIVERSE — anchor from ${universe.designation}`,
          successPath: '/defy?session_id={CHECKOUT_SESSION_ID}',
          cancelPath: '/defy',
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.url) throw new Error(d?.error || 'Could not reach the anchor.')
      window.location.href = d.url
    } catch (e: any) {
      setError(e.message); setBusy(false)
    }
  }

  /**
   * Bitcoin over Lightning, on the Strike rails already in this repo. Anchors are
   * small and Stripe's 2.9% + $0.30 eats 15% of a $5 one; Lightning keeps nearly all
   * of it, which is the whole reason this path exists.
   */
  const anchorLightning = async () => {
    if (!universe) return
    setBusy(true); setError(null); setLnState('waiting')
    try {
      const r = await fetch('/api/shop/payments/strike', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount, currency: 'USD',
          description: `DEFY MULTIVERSE — anchor from ${universe.designation}`,
        }),
      })
      const d = await r.json()
      if (!r.ok || !d.lnInvoice) throw new Error(d?.error || 'Could not open a Lightning invoice.')
      setLn({ invoiceId: d.invoiceId, lnInvoice: d.lnInvoice })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Poll Strike until the invoice is paid, then confirm the anchor. Strike is the
  // source of truth on both ends: the server re-checks before writing the register.
  useEffect(() => {
    if (!ln || lnState === 'paid' || !token) return
    let alive = true
    const id = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/shop/payments/strike/status?invoiceId=${encodeURIComponent(ln.invoiceId)}`)
        const d = await r.json()
        if (!alive) return
        if (d.state === 'PAID') {
          setLnState('paid')
          await fetch('/api/defy/anchor-confirm', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, invoiceId: ln.invoiceId }),
          })
        } else if (d.state === 'CANCELLED') {
          setLn(null)
          setError('That invoice expired. Open a new one.')
        }
      } catch { /* a dropped poll is not a failure; the next tick retries */ }
    }, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [ln, lnState, token])

  const shareLine = universe && state
    ? `I am ${universe.designation}. ${state.player?.streak ?? 0} days defiant. defymultiverse.com`
    : ''

  /* ------------------------------------------------------------- the gate */
  if (!universe) {
    return (
      <div className="defy">
        <Helmet>
          <title>DEFY MULTIVERSE</title>
          <meta name="description" content="Your email is an address. It resolves to one of 18,446,744,073,709,551,616 universes. One question a day. The smallest side wins." />
          <link rel="canonical" href={canonicalHref()} />
        </Helmet>
        <div className="defy-shell">
          <div className="defy-gate">
            <div className="defy-mark">DEFY MULTIVERSE</div>

            {pass > 0 ? (
              <>
                <div className="defy-deriving">DERIVING ADDRESS — PASS {Math.min(pass, 3)} OF 3</div>
                <div className="defy-addr-roll">{rolling}</div>
              </>
            ) : (
              <>
                <h1 className="defy-ask">You do not choose your universe. Your address chooses it.</h1>
                <p className="defy-sub">
                  An email is not a login here. It is a coordinate. Yours resolves to exactly one of{' '}
                  <strong>18,446,744,073,709,551,616</strong> universes — its name, its colour, its
                  physics, its creed — and it will resolve to that same one forever.
                </p>
                <form className="defy-field" onSubmit={enter}>
                  <input
                    className="defy-input" type="email" value={email} inputMode="email"
                    autoComplete="email" placeholder="address@somewhere"
                    onChange={e => setEmail(e.target.value)} disabled={busy} aria-label="Your email address"
                  />
                  <button className="defy-go" type="submit" disabled={busy || !email}>
                    {busy ? 'RESOLVING' : 'RESOLVE'}
                  </button>
                </form>
                {error && <div className="defy-err">{error}</div>}
                <div className="defy-fine">
                  ONE QUESTION A DAY. THE SMALLEST SIDE WINS.<br />
                  Entering also subscribes you at UNIVERSE PRIME. Unsubscribe any time.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------ the world */
  const s = state!
  const answered = Boolean(s.yourChoice)
  const mine = s.player?.universe.constellationKey

  return (
    <div className="defy" data-open="1" style={vars}>
      <Helmet>
        <title>{universe.name} — DEFY MULTIVERSE</title>
        <meta name="description" content="One question a day. The smallest side wins." />
        <link rel="canonical" href={canonicalHref()} />
      </Helmet>

      <div className="defy-shell">
        <div className="defy-mark">DEFY MULTIVERSE</div>

        {/* your universe */}
        <section className="defy-block">
          <div className="defy-label">YOUR UNIVERSE</div>
          <h1 className="defy-name">{universe.name}</h1>
          <div className="defy-addr">{universe.address} · {universe.constellationKey}</div>
          <p className="defy-creed">{universe.creed}</p>
          <div className="defy-rare">
            {universe.constellationBlurb}<br />
            ONE OF 18,446,744,073,709,551,616 · SCORE {s.player?.score ?? 0} · STREAK {s.player?.streak ?? 0}
          </div>
          <div className="defy-traits">
            {Object.entries(universe.traits).map(([k, v]) => (
              <div className="defy-trait" key={k}>
                <span>{k}</span>
                <span className="defy-bar"><i style={{ width: `${v}%` }} /></span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* today */}
        {s.defiance && (
          <section className="defy-block">
            <div className="defy-label">TODAY'S DEFIANCE — {s.day}</div>
            <h2 className="defy-prompt">{s.defiance.prompt}</h2>
            <div className="defy-options">
              <button className="defy-opt" onClick={() => choose('a')} disabled={answered}
                data-chosen={s.yourChoice === 'a' ? '1' : '0'} data-dim={answered && s.yourChoice !== 'a' ? '1' : '0'}>
                {s.defiance.optionA}
              </button>
              <button className="defy-opt" onClick={() => choose('b')} disabled={answered}
                data-chosen={s.yourChoice === 'b' ? '1' : '0'} data-dim={answered && s.yourChoice !== 'b' ? '1' : '0'}>
                {s.defiance.optionB}
              </button>
            </div>
            <div className="defy-answered">
              {answered
                ? <>ANSWERED. THE SPLIT IS SEALED UNTIL THE DAY CLOSES.<br />Knowing it now would tell you which side to take — which is the whole game.</>
                : <>THE SMALLEST SIDE SCORES. BEING 1 AGAINST 99 PAYS 99.</>}
            </div>
          </section>
        )}

        {/* yesterday */}
        {s.lastResolved && (
          <section className="defy-block">
            <div className="defy-label">SETTLED — {s.lastResolved.day}</div>
            <h2 className="defy-prompt" style={{ fontSize: '1.15rem' }}>{s.lastResolved.prompt}</h2>
            <div className="defy-row">
              <span className="defy-rank">{s.lastResolved.minority === 'a' ? '◂' : ' '}</span>
              <span className="defy-key">{s.lastResolved.option_a}</span>
              <span className="defy-num">{s.lastResolved.count_a}</span>
            </div>
            <div className="defy-row">
              <span className="defy-rank">{s.lastResolved.minority === 'b' ? '◂' : ' '}</span>
              <span className="defy-key">{s.lastResolved.option_b}</span>
              <span className="defy-num">{s.lastResolved.count_b}</span>
            </div>
            <div className="defy-answered">◂ DEFIED, AND SCORED.</div>
          </section>
        )}

        {/* standings */}
        <section className="defy-block">
          <div className="defy-label">CONSTELLATIONS — {s.standings.totalUniverses} UNIVERSES OPEN</div>
          {s.standings.constellations.map((c, i) => (
            <div className="defy-row" key={c.key}>
              <span className="defy-rank">{i + 1}</span>
              <span className="defy-key">
                {c.key}
                {c.key === mine && <span className="defy-mine">YOURS</span>}
              </span>
              <span className="defy-num">{c.score.toLocaleString()} · {c.universes}</span>
            </div>
          ))}
        </section>

        {/* prime */}
        <section className="defy-prime">
          <div className="defy-label">UNIVERSE PRIME</div>
          <p className="defy-sub" style={{ marginBottom: '0.5rem' }}>
            Every universe here is a departure from one. PRIME is where the consensus you spend
            each day refusing is actually written down.
          </p>
          <a className="defy-link" href={s.primeUrl} target="_blank" rel="noopener">
            CROSS TO PRIME — THELOSTANDUNFOUNDS.COM →
          </a>

          <div className="defy-label" style={{ marginTop: '2.5rem' }}>ANCHOR</div>
          <p className="defy-sub" style={{ marginBottom: '0.5rem' }}>
            Anchoring funds PRIME and writes your designation into a public register. It buys no
            advantage, no points and no shortcut — deliberately. It is a name on a wall.
          </p>
          <div className="defy-anchor-row">
            {ANCHOR_AMOUNTS.map(a => (
              <button key={a} className="defy-amt" data-on={amount === a ? '1' : '0'}
                onClick={() => { setAmount(a); setLn(null) }}>
                ${a}
              </button>
            ))}
            <button className="defy-go" onClick={anchor} disabled={busy}>CARD</button>
            <button className="defy-go" onClick={anchorLightning} disabled={busy}>BITCOIN</button>
          </div>
          {error && <div className="defy-err">{error}</div>}

          {ln && lnState === 'waiting' && (
            <div className="defy-ln">
              <div className="defy-label" style={{ marginBottom: '1rem' }}>
                ${amount} · SCAN WITH ANY LIGHTNING WALLET
              </div>
              {/* Rendered locally rather than through a QR web service, so no third
                  party ever sees an invoice belonging to one of your anchors. */}
              <QRCodeSVG value={ln.lnInvoice.toUpperCase()} size={208} level="M"
                bgColor="#000000" fgColor="#ffffff" marginSize={2} />
              <div className="defy-anchor-row">
                <a className="defy-amt" href={`lightning:${ln.lnInvoice}`}>OPEN WALLET</a>
                <button className="defy-amt"
                  onClick={() => navigator.clipboard?.writeText(ln.lnInvoice)}>COPY INVOICE</button>
                <button className="defy-amt" onClick={() => setLn(null)}>CANCEL</button>
              </div>
              <p className="defy-ledger">Waiting for payment. This updates itself.</p>
            </div>
          )}

          {lnState === 'paid' && (
            <p className="defy-answered">
              ANCHORED. {universe.designation} IS IN THE REGISTER.
            </p>
          )}

          <div className="defy-label" style={{ marginTop: '2.5rem' }}>THE LEDGER</div>
          <p className="defy-ledger">
            Every settled day is hashed into an append-only chain, each entry committing to the one
            before it. You do not have to trust the counts.{' '}
            <a className="defy-link" href="/api/defy/ledger" target="_blank" rel="noopener">VERIFY →</a>
          </p>

          <div className="defy-label" style={{ marginTop: '2.5rem' }}>CARRY IT</div>
          <button className="defy-amt" onClick={() => {
            navigator.clipboard?.writeText(shareLine)
          }}>COPY YOUR DESIGNATION</button>
          <p className="defy-ledger" style={{ marginTop: '0.9rem' }}>{shareLine}</p>
        </section>
      </div>
    </div>
  )
}
