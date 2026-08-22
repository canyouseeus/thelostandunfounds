/**
 * DEFY MULTIVERSE — operator console.
 *
 * The game is multiversal; this is not. Per the owner's instruction this page is
 * held to the LOST+UNFOUNDS Noir system: pure black, no borders, no shadows,
 * square corners, uppercase headings. You are looking at DEFY from PRIME.
 *
 * admin-ops: "Every admin dashboard — without exception — must mount the Debug
 * Report button." It is mounted below, alongside a live 30s refresh and verbose
 * errors that name the endpoint, the HTTP status and the raw body.
 */
import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AnimatedNumber } from '@/components/ui/animated-number'
import CopyDebugReport from '../components/admin/CopyDebugReport'
import { logApiCall, logError } from '../lib/adminErrorLog'
import { useAuth } from '../contexts/AuthContext'

const REFRESH_MS = 30_000
const SQUARE = { borderRadius: 0 } as const

interface Report {
  generatedAt: string
  day: string
  funnel: { universes: number; newToday: number; new7d: number; everPlayed: number; active7d: number; answeredToday: number; activationPct: number }
  prime: { crossings: number; subscribersTotal: number }
  money: { anchorCount: number; anchorUsd: number; anchorUsd30d: number; dailyAverage30d: number; goalPerDay: number }
  content: { poolLeft: number; poolTotal: number; daysOfRunway: number }
  ledger: { length: number; recent: { day: string; count_a: number; count_b: number; minority: string | null; award: number; entry_hash: string }[] }
  today: { prompt: string; option_a: string; option_b: string } | null
  byConstellation: { key: string; universes: number; score: number }[]
  recentAnchors: { designation: string; usd: number; at: string }[]
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 p-5" style={SQUARE}>
      <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-3 text-left">{label}</div>
      {children}
    </div>
  )
}

function Stat({ value, unit, sub }: { value: number; unit?: string; sub?: string }) {
  return (
    <div className="text-left">
      <div className="text-3xl sm:text-4xl font-light text-white tabular-nums">
        {unit === '$' && '$'}<AnimatedNumber value={value} />{unit && unit !== '$' && <span className="text-lg text-white/60 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-white/50 mt-2 text-left leading-relaxed">{sub}</div>}
    </div>
  )
}

export default function AdminDefy() {
  const { user } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    const endpoint = '/api/defy/admin'
    try {
      const r = await fetch(endpoint, { headers: { 'X-Admin-Email': user?.email || '' } })
      const raw = await r.text()
      logApiCall('GET', endpoint, r.status, raw.slice(0, 200))

      if (!r.ok) {
        // Verbose by design: status, endpoint and raw body, readable on a phone.
        throw new Error(`HTTP ${r.status} ${r.statusText} — GET ${endpoint}\n${raw.slice(0, 500) || '(empty body)'}`)
      }
      setReport(JSON.parse(raw))
      setError(null)
      setLoadedAt(new Date().toLocaleTimeString())
    } catch (e: any) {
      const msg = e?.message || String(e)
      logError(msg)
      setError(msg)
    }
  }, [user?.email])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const m = report?.money
  const goalPct = m && m.goalPerDay ? Math.min(100, Math.round((m.dailyAverage30d / m.goalPerDay) * 100)) : 0

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 py-8">
      <Helmet><title>DEFY MULTIVERSE | ADMIN</title><meta name="robots" content="noindex,nofollow" /></Helmet>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-left">DEFY MULTIVERSE</h1>
          <CopyDebugReport />
        </div>
        <p className="text-[11px] text-white/50 mb-8 text-left">
          OPERATOR CONSOLE · {report?.day ?? '—'} · REFRESHES EVERY 30s
          {loadedAt && ` · LAST ${loadedAt}`}
        </p>

        {error && (
          <div className="bg-white/5 p-5 mb-6" style={SQUARE}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-400 mb-2 text-left">CONSOLE ERROR</div>
            <pre className="text-[11px] text-red-300 whitespace-pre-wrap break-words text-left font-mono">{error}</pre>
          </div>
        )}

        {!report && !error && <p className="text-white/50 text-sm text-left">Loading live counts…</p>}

        {report && (
          <>
            <h2 className="text-sm uppercase tracking-[0.28em] text-white/70 mb-3 text-left">THE FUNNEL</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <Card label="UNIVERSES OPEN">
                <Stat value={report.funnel.universes} sub={`+${report.funnel.newToday} today · +${report.funnel.new7d} this week`} />
              </Card>
              <Card label="ANSWERED TODAY">
                <Stat value={report.funnel.answeredToday} sub={`${report.funnel.active7d} played in the last 7 days`} />
              </Card>
              <Card label="ACTIVATION">
                <Stat value={report.funnel.activationPct} unit="%" sub={`${report.funnel.everPlayed} of ${report.funnel.universes} ever answered a defiance`} />
              </Card>
              <Card label="CROSSED TO PRIME">
                <Stat value={report.prime.crossings} sub={`of ${report.prime.subscribersTotal} total subscribers · source=defy_multiverse`} />
              </Card>
            </div>

            <h2 className="text-sm uppercase tracking-[0.28em] text-white/70 mb-3 text-left">THE MONEY</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <Card label="ANCHOR REVENUE · 30D">
                <Stat value={m!.anchorUsd30d} unit="$" sub={`${m!.anchorCount} anchors all time · $${m!.anchorUsd} total`} />
              </Card>
              <Card label="DAILY AVERAGE · 30D">
                <Stat value={m!.dailyAverage30d} unit="$" sub={`Goal is $${m!.goalPerDay}/day`} />
              </Card>
              <Card label="AGAINST GOAL">
                <Stat value={goalPct} unit="%" sub="Anchors alone. Sponsored universes are booked in PRIME, not here." />
              </Card>
              <Card label="LEDGER ENTRIES">
                <Stat value={report.ledger.length} sub="Settled days, hash-chained and public" />
              </Card>
            </div>
            <div className="bg-white/5 p-5 mb-8" style={SQUARE}>
              <div className="h-1 bg-white/10" style={SQUARE}>
                <div className="h-1 bg-white" style={{ ...SQUARE, width: `${goalPct}%` }} />
              </div>
              <p className="text-[11px] text-white/50 mt-3 text-left leading-relaxed">
                Anchoring is honorific by design — it buys no advantage — so it will not reach
                $150/day on its own. This bar measures only the voluntary line.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
              <Card label={`TODAY'S DEFIANCE · ${report.day}`}>
                {report.today ? (
                  <div className="text-left">
                    <p className="text-white text-base mb-3 leading-relaxed">{report.today.prompt}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">A · {report.today.option_a}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">B · {report.today.option_b}</p>
                  </div>
                ) : <p className="text-white/50 text-sm text-left">No day claimed yet — the first visitor claims it.</p>}
              </Card>
              <Card label="QUESTION RUNWAY">
                <Stat value={report.content.poolLeft} unit="days" sub={`${report.content.poolLeft} unused of ${report.content.poolTotal}. At zero the pool recycles the oldest question rather than showing an empty day.`} />
              </Card>
            </div>

            <h2 className="text-sm uppercase tracking-[0.28em] text-white/70 mb-3 text-left">CONSTELLATIONS</h2>
            <div className="bg-white/5 p-5 mb-8" style={SQUARE}>
              {report.byConstellation.map((c, i) => (
                <div key={c.key} className="grid grid-cols-[2rem_1fr_auto] gap-3 items-baseline py-2 text-left">
                  <span className="text-[11px] text-white/30 font-mono">{i + 1}</span>
                  <span className="text-[12px] uppercase tracking-[0.18em] text-white">{c.key}</span>
                  <span className="text-[12px] text-white/70 font-mono tabular-nums">{c.score.toLocaleString()} · {c.universes}</span>
                </div>
              ))}
            </div>

            <h2 className="text-sm uppercase tracking-[0.28em] text-white/70 mb-3 text-left">THE LEDGER</h2>
            <div className="bg-white/5 p-5 mb-8 overflow-x-auto" style={SQUARE}>
              {report.ledger.recent.length ? report.ledger.recent.map(l => (
                <div key={l.day} className="py-2 text-left font-mono text-[11px] text-white/70 whitespace-nowrap">
                  {l.day} · A {l.count_a} / B {l.count_b} · MINORITY {l.minority?.toUpperCase() ?? '—'} · +{l.award}
                  <span className="text-white/30"> · {l.entry_hash.slice(0, 16)}…</span>
                </div>
              )) : <p className="text-white/50 text-sm text-left">Nothing settled yet. The first entry appears once a day closes.</p>}
            </div>

            <h2 className="text-sm uppercase tracking-[0.28em] text-white/70 mb-3 text-left">THE ANCHORED</h2>
            <div className="bg-white/5 p-5" style={SQUARE}>
              {report.recentAnchors.length ? report.recentAnchors.map(a => (
                <div key={a.at} className="grid grid-cols-[1fr_auto] gap-3 items-baseline py-2 text-left">
                  <span className="text-[12px] text-white font-mono truncate">{a.designation}</span>
                  <span className="text-[12px] text-white/70 font-mono">${a.usd}</span>
                </div>
              )) : <p className="text-white/50 text-sm text-left">No anchors yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
