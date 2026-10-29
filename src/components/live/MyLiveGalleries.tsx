/**
 * A photographer's own live galleries, on their dashboard.
 *
 * Create a gallery for tonight, go live, and send photos straight from the
 * phone's camera roll — they publish as they arrive. Everything goes through
 * /api/gallery/my-live and the ingest routes with the photographer's own
 * session; the server only lets them touch galleries they own.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useCallback, useEffect, useState } from 'react'
import LiveUploader, { UploadTermsNotice } from './LiveUploader'
import TermsGate from './TermsGate'

interface Gallery {
  id: string
  slug: string
  name: string
  live_mode: boolean | null
  created_at: string
}

const btn = 'px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40'
const primary = `${btn} bg-white text-black hover:bg-white/10 hover:text-white`
const secondary = `${btn} bg-white/10 text-white hover:bg-white hover:text-black`
const field = 'w-full bg-white/5 text-white px-4 py-3 text-sm focus:outline-none focus:bg-white/10'

async function myLive<T>(init?: RequestInit): Promise<T> {
  const res = await fetch('/api/gallery/my-live', {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body as T
}

export default function MyLiveGalleries() {
  const [galleries, setGalleries] = useState<Gallery[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [name, setName] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // The server's word on it — it refuses uploads until this is true anyway.
  const [terms, setTerms] = useState<{ accepted: boolean; version: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await myLive<{ galleries: Gallery[]; termsAccepted: boolean; termsVersion: string }>()
      setGalleries(data.galleries)
      setTerms({ accepted: data.termsAccepted, version: data.termsVersion })
    } catch {
      // Not a crew photographer (or signed out): this section has nothing to offer.
      setUnavailable(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function agreeToTerms() {
    const result = await myLive<{ termsAccepted: boolean; termsVersion: string }>({
      method: 'POST',
      body: JSON.stringify({ action: 'accept-terms', version: terms?.version }),
    })
    setTerms({ accepted: result.termsAccepted, version: result.termsVersion })
  }

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const { gallery } = await myLive<{ gallery: Gallery }>({ method: 'POST', body: JSON.stringify({ action: 'create', name }) })
      setName('')
      setGalleries(prev => [gallery, ...(prev || [])])
      setOpen(gallery.slug)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(g: Gallery) {
    setBusy(true)
    setError(null)
    try {
      const { live_mode } = await myLive<{ live_mode: boolean }>({
        method: 'POST',
        body: JSON.stringify({ action: g.live_mode ? 'stop' : 'start', slug: g.slug }),
      })
      setGalleries(prev => (prev || []).map(x => (x.slug === g.slug ? { ...x, live_mode } : x)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const galleryUrl = (slug: string) => `${window.location.origin}/gallery/${slug}`

  function share(slug: string, galleryName: string) {
    const url = galleryUrl(slug)
    if (typeof navigator.share === 'function') {
      navigator.share({ title: galleryName, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url)
      setCopied(slug)
    }
  }

  // Nothing until the server has said this is a crew photographer — otherwise
  // everyone else would see the section flash up and vanish.
  if (unavailable || galleries === null) return null

  return (
    <div className="mb-6 bg-white/5 p-6 text-left" style={{ borderRadius: 0 }}>
      <h2 className="text-xl font-bold uppercase tracking-tighter mb-1">LIVE GALLERIES</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Start a gallery for tonight and send photos from your camera roll — guests see them as they land.
      </p>

      {error && (
        <div className="bg-red-500/10 p-4 mb-4" style={{ borderRadius: 0 }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!terms?.accepted ? (
        <TermsGate onAgree={agreeToTerms} />
      ) : (
      <>
      <div className="flex flex-wrap gap-2 mb-6">
        <input className={`${field} flex-1 min-w-[12rem]`} style={{ borderRadius: 0 }}
          placeholder="Event name, e.g. Halloween at Primos" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2 && !busy) create() }} />
        <button className={primary} style={{ borderRadius: 0 }} disabled={busy || name.trim().length < 2} onClick={create}>
          New live gallery
        </button>
      </div>

      {galleries.length === 0 ? (
        <p className="text-white/40 text-xs">No galleries yet.</p>
      ) : (
        <div className="space-y-2">
          {galleries.map(g => (
            <div key={g.id} className="bg-black p-4" style={{ borderRadius: 0 }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.15em] truncate">{g.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-[0.25em] mt-1 ${g.live_mode ? 'text-green-400' : 'text-white/40'}`}>
                    {g.live_mode ? '● Live' : 'Not live'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={g.live_mode ? secondary : primary} style={{ borderRadius: 0 }} disabled={busy}
                    onClick={() => toggle(g)}>
                    {g.live_mode ? 'End live' : 'Go live'}
                  </button>
                  <button className={secondary} style={{ borderRadius: 0 }} onClick={() => share(g.slug, g.name)}>
                    {copied === g.slug ? 'Link copied' : 'Share gallery'}
                  </button>
                  <button className={open === g.slug ? primary : secondary} style={{ borderRadius: 0 }}
                    onClick={() => setOpen(open === g.slug ? null : g.slug)}>
                    {open === g.slug ? 'Close' : 'Send photos'}
                  </button>
                </div>
              </div>
              {open === g.slug && (
                <div className="mt-4">
                  <LiveUploader slug={g.slug} />
                  <UploadTermsNotice />
                  <a href={`/gallery/${g.slug}`} target="_blank" rel="noreferrer"
                    className="inline-block mt-4 text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white underline underline-offset-4">
                    View gallery
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}
