/**
 * A photographer's own live galleries, on their dashboard.
 *
 * Laid out like the admin live console (/admin/live): pick a gallery (or
 * start one), go live, and send photos straight from the
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
const label = 'block text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-2'

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
  // The gallery being worked on — the admin console's ?slug=, kept in state here.
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // The server's word on it — it refuses uploads until this is true anyway.
  const [terms, setTerms] = useState<{ accepted: boolean; version: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await myLive<{ galleries: Gallery[]; termsAccepted: boolean; termsVersion: string }>()
      setGalleries(data.galleries)
      // Tonight's gallery if one is already live, so a reload mid-event lands on it.
      setSelected(prev => prev || data.galleries.find(g => g.live_mode)?.slug || '')
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
      setSelected(gallery.slug)
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

  const current = galleries.find(g => g.slug === selected) || null

  return (
    <div data-tour="pg-live" className="mb-6 bg-white/5 p-6 text-left" style={{ borderRadius: 0 }}>
      {/* Same order as the admin live console (/admin/live): title with the
          gallery's status and GO LIVE beside it, then the gallery picker, then
          the camera roll. One gallery at a time instead of a row of buttons
          per gallery. */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
        <h2 className="text-sm font-black uppercase tracking-[0.25em]">LIVE GALLERIES</h2>
        {terms?.accepted && current && (
          <div data-tour="pg-live-go" className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${current.live_mode ? 'text-green-400' : 'text-white/40'}`}>
              {current.live_mode ? '● Live' : 'Not live'}
            </span>
            <button className={current.live_mode ? secondary : primary} style={{ borderRadius: 0 }} disabled={busy}
              onClick={() => toggle(current)}>
              {current.live_mode ? 'End live' : 'Go live'}
            </button>
          </div>
        )}
      </div>
      <p className="text-white/50 text-xs mb-6">
        Start a gallery for tonight and send photos from your camera roll — guests see them as they land.
      </p>

      {error && (
        <div className="bg-red-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!terms?.accepted ? (
        <TermsGate onAgree={agreeToTerms} />
      ) : (
      <>
      {galleries.length > 0 && (
        <div data-tour="pg-live-picker" className="mb-6">
          <label className={label}>Gallery</label>
          <select data-tour="pg-live-select" className={field} style={{ borderRadius: 0 }} value={selected}
            onChange={e => setSelected(e.target.value)}>
            <option value="">Choose a gallery…</option>
            {galleries.map(g => (
              <option key={g.id} value={g.slug}>{g.name}{g.live_mode ? ' — LIVE' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div data-tour="pg-live-new" className="mb-8">
        <label className={label}>{galleries.length ? 'Or start a new one' : 'Start a gallery'}</label>
        <div className="flex flex-wrap gap-2">
          <input className={`${field} flex-1 min-w-[12rem]`} style={{ borderRadius: 0 }}
            placeholder="Event name, e.g. Halloween at Primos" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2 && !busy) create() }} />
          <button className={primary} style={{ borderRadius: 0 }} disabled={busy || name.trim().length < 2} onClick={create}>
            New live gallery
          </button>
        </div>
      </div>

      {current && (
        <div data-tour="pg-live-uploader" className="bg-black p-6" style={{ borderRadius: 0 }}>
          <h3 className="text-sm font-black uppercase tracking-[0.25em] mb-2">SEND FROM CAMERA ROLL</h3>
          <p className="text-white/50 text-xs mb-4">
            Pick photos your camera app has dropped into your phone. They go straight into the gallery — no review.
          </p>
          <LiveUploader slug={current.slug} />
          <UploadTermsNotice />
          <div className="flex flex-wrap gap-2 mt-6">
            <button data-tour="pg-live-share" className={secondary} style={{ borderRadius: 0 }} onClick={() => share(current.slug, current.name)}>
              {copied === current.slug ? 'Link copied' : 'Share gallery'}
            </button>
            <a href={`/gallery/${current.slug}`} target="_blank" rel="noreferrer" className={secondary} style={{ borderRadius: 0 }}>
              View gallery
            </a>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
