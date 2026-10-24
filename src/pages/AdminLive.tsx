/**
 * Live event console — /admin/live?slug=<gallery>
 *
 * Photos sent from the camera during an event wait here, in the gallery's
 * private inbox, until they are reviewed. Select the keepers and PUBLISH —
 * they go into the gallery and appear live for guests. DISCARD deletes the
 * rest from Google Drive for good; nothing is kept.
 *
 * There is deliberately no "discard everything unselected": photos keep
 * arriving while you review, and a frame that landed a second ago would be
 * deleted without ever being seen.
 *
 * Noir: black, uppercase, square, no borders and no shadows
 * (`no-border-design` is the authority).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Gallery {
  id: string
  slug: string
  name: string
  live_mode: boolean | null
}

interface IngestKey {
  id: string
  key_prefix: string
  label: string | null
  created_at: string
  revoked_at: string | null
  last_used_at: string | null
  upload_count: number
}

interface Pending {
  drive_file_id: string
  file_name: string | null
  received_at: string
}

const POLL_MS = 8000
const PREVIEW_CONCURRENCY = 4

const btn = 'px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40'
const primary = `${btn} bg-white text-black hover:bg-white/10 hover:text-white`
const secondary = `${btn} bg-white/10 text-white hover:bg-white hover:text-black`
const danger = `${btn} bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white`
const field = 'w-full bg-white/5 text-white px-4 py-3 text-sm focus:outline-none focus:bg-white/10'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body as T
}

export default function AdminLive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [liveMode, setLiveMode] = useState(false)
  const [keys, setKeys] = useState<IngestKey[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState<{ fileId: string; url: string | null } | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [keyLabel, setKeyLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Object URLs we own, so they can be released when a photo leaves the inbox.
  const previewUrls = useRef<Record<string, string>>({})
  const requested = useRef<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('photo_libraries')
      .select('id, slug, name, live_mode')
      .order('name')
      .then(({ data }) => setGalleries((data as Gallery[]) || []))
  }, [])

  const loadEvent = useCallback(async () => {
    if (!slug) return
    try {
      const data = await api<{ live_mode: boolean; keys: IngestKey[] }>(
        `/api/gallery/live-event?slug=${encodeURIComponent(slug)}`
      )
      setLiveMode(data.live_mode)
      setKeys(data.keys)
    } catch (err: any) {
      setError(err.message)
    }
  }, [slug])

  const loadInbox = useCallback(async () => {
    if (!slug) return
    try {
      const data = await api<{ pending: Pending[] }>(`/api/gallery/live-inbox?slug=${encodeURIComponent(slug)}`)
      setPending(data.pending)
      // Drop selections for photos that are no longer waiting.
      const ids = new Set(data.pending.map(p => p.drive_file_id))
      setSelected(prev => new Set([...prev].filter(id => ids.has(id))))
    } catch (err: any) {
      setError(err.message)
    }
  }, [slug])

  // Reset when switching galleries.
  useEffect(() => {
    setPending([])
    setSelected(new Set())
    setNewKey(null)
    setNotice(null)
    setError(null)
    loadEvent()
    loadInbox()
  }, [slug, loadEvent, loadInbox])

  // Watch the inbox while the tab is visible.
  useEffect(() => {
    if (!slug) return
    const tick = () => { if (document.visibilityState === 'visible') loadInbox() }
    const timer = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [slug, loadInbox])

  // Fetch thumbnails a few at a time. They come from an admin-only route, so an
  // <img src> cannot load them directly — it would not carry the session.
  useEffect(() => {
    const live = new Set(pending.map(p => p.drive_file_id))
    for (const [id, url] of Object.entries(previewUrls.current)) {
      if (!live.has(id)) {
        URL.revokeObjectURL(url)
        delete previewUrls.current[id]
        requested.current.delete(id)
      }
    }
    setPreviews({ ...previewUrls.current })

    const queue = pending.map(p => p.drive_file_id).filter(id => !requested.current.has(id))
    let cancelled = false
    const worker = async () => {
      while (!cancelled && queue.length) {
        const id = queue.shift()!
        requested.current.add(id)
        try {
          const res = await fetch(`/api/gallery/live-preview?fileId=${encodeURIComponent(id)}&size=500`)
          if (!res.ok) throw new Error(String(res.status))
          const url = URL.createObjectURL(await res.blob())
          previewUrls.current[id] = url
          // Shown even if a newer poll restarted the loader mid-fetch — the
          // restart only stops this worker taking more off the queue.
          setPreviews(p => ({ ...p, [id]: url }))
        } catch {
          // Leave it unrequested so the next poll tries again.
          requested.current.delete(id)
        }
      }
    }
    for (let i = 0; i < PREVIEW_CONCURRENCY; i++) worker()
    return () => { cancelled = true }
  }, [pending])

  useEffect(() => () => {
    for (const url of Object.values(previewUrls.current)) URL.revokeObjectURL(url)
  }, [])

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedIds = useMemo(() => [...selected], [selected])

  async function act(action: 'publish' | 'discard') {
    if (!selectedIds.length) return
    if (action === 'discard' && !window.confirm(
      `Delete ${selectedIds.length} photo${selectedIds.length === 1 ? '' : 's'} permanently? They are removed from Google Drive and cannot be recovered.`
    )) return
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const result = await api<{ published?: number; discarded?: number; results: Array<{ ok: boolean; error?: string }> }>(
        '/api/gallery/live-inbox',
        { method: 'POST', body: JSON.stringify({ slug, action, fileIds: selectedIds }) }
      )
      const done = result.published ?? result.discarded ?? 0
      const failed = result.results.filter(r => !r.ok)
      setNotice(`${action === 'publish' ? 'Published' : 'Deleted'} ${done} photo${done === 1 ? '' : 's'}.`)
      if (failed.length) setError(`${failed.length} failed: ${failed[0].error}`)
      await loadInbox()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function eventAction(action: 'start' | 'stop' | 'mint-key' | 'revoke-key', extra: Record<string, string> = {}) {
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ key?: string; live_mode?: boolean }>('/api/gallery/live-event', {
        method: 'POST',
        body: JSON.stringify({ slug, action, ...extra }),
      })
      if (data.key) {
        setNewKey(data.key)
        setKeyLabel('')
      }
      await loadEvent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function view(fileId: string) {
    setViewing({ fileId, url: null })
    try {
      const res = await fetch(`/api/gallery/live-preview?fileId=${encodeURIComponent(fileId)}&size=1600`)
      if (!res.ok) throw new Error(String(res.status))
      const url = URL.createObjectURL(await res.blob())
      setViewing(v => (v?.fileId === fileId ? { fileId, url } : v))
    } catch {
      setViewing(null)
      setError('Could not load that photo.')
    }
  }

  function closeView() {
    if (viewing?.url) URL.revokeObjectURL(viewing.url)
    setViewing(null)
  }

  const activeKeys = keys.filter(k => !k.revoked_at)

  return (
    <div className={`min-h-screen bg-black text-white px-5 pt-12 ${selected.size > 0 ? 'pb-48' : 'pb-12'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <h1 className="text-3xl font-black uppercase tracking-[0.2em]">LIVE EVENT</h1>
          {slug && (
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${liveMode ? 'text-green-400' : 'text-white/40'}`}>
                {liveMode ? '● Live' : 'Not live'}
              </span>
              <button className={liveMode ? secondary : primary} style={{ borderRadius: 0 }} disabled={busy}
                onClick={() => eventAction(liveMode ? 'stop' : 'start')}>
                {liveMode ? 'End live' : 'Go live'}
              </button>
            </div>
          )}
        </div>

        <div className="mb-8">
          <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-2">Gallery</label>
          <select className={field} style={{ borderRadius: 0 }} value={slug}
            onChange={e => setSearchParams(e.target.value ? { slug: e.target.value } : {})}>
            <option value="">Choose a gallery…</option>
            {galleries.map(g => (
              <option key={g.id} value={g.slug}>{g.name}{g.live_mode ? ' — LIVE' : ''}</option>
            ))}
          </select>
        </div>

        {notice && (
          <div className="bg-green-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
            <p className="text-green-400 text-sm text-left">{notice}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 p-4 mb-6" style={{ borderRadius: 0 }}>
            <p className="text-red-400 text-sm text-left">{error}</p>
          </div>
        )}

        {slug && (
          <>
            {/* Review inbox */}
            <div className="py-4 mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                {pending.length} waiting · {selected.size} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <button className={secondary} style={{ borderRadius: 0 }} disabled={!pending.length}
                  onClick={() => setSelected(new Set(pending.map(p => p.drive_file_id)))}>
                  Select all
                </button>
                <button className={secondary} style={{ borderRadius: 0 }} disabled={!selected.size}
                  onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </div>
            </div>

            {pending.length === 0 ? (
              <div className="bg-white/5 p-10 mb-12 text-left" style={{ borderRadius: 0 }}>
                <p className="text-sm text-white/60">
                  Nothing waiting. Photos from the camera show up here within a few seconds of arriving.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-12">
                {pending.map(p => {
                  const isSelected = selected.has(p.drive_file_id)
                  const src = previews[p.drive_file_id]
                  return (
                    <div key={p.drive_file_id} className={`relative ${isSelected ? 'bg-white' : 'bg-white/5'} p-1`}
                      style={{ borderRadius: 0 }}>
                      <button type="button" onClick={() => toggle(p.drive_file_id)}
                        className="block w-full aspect-square bg-black overflow-hidden" style={{ borderRadius: 0 }}
                        aria-pressed={isSelected} aria-label={`Select ${p.file_name || 'photo'}`}>
                        {src ? (
                          <img src={src} alt={p.file_name || ''}
                            className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80'}`} />
                        ) : (
                          <span className="flex w-full h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/30">
                            Loading
                          </span>
                        )}
                      </button>
                      <div className={`flex items-center justify-between px-1 pt-1 text-[10px] uppercase tracking-[0.15em] ${isSelected ? 'text-black' : 'text-white/50'}`}>
                        <span className="truncate">{new Date(p.received_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
                        <button type="button" onClick={() => view(p.drive_file_id)}
                          className={`font-black ${isSelected ? 'hover:text-black/60' : 'hover:text-white'}`}>
                          View
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Upload keys */}
            <div className="bg-white/5 p-8" style={{ borderRadius: 0 }}>
              <h2 className="text-sm font-black uppercase tracking-[0.25em] mb-4">CAMERA UPLOAD KEYS</h2>
              <p className="text-white/50 text-xs mb-6 text-left">
                A key lets one uploader (the Canon FTP relay, the Fuji laptop) send photos into this gallery's inbox.
                It cannot publish, delete or see anything. Revoke it when the event is over.
              </p>

              {newKey && (
                <div className="bg-black p-4 mb-6" style={{ borderRadius: 0 }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-2">
                    Copy it now — it is not shown again
                  </p>
                  <code className="block text-xs break-all text-white mb-3">{newKey}</code>
                  <button className={secondary} style={{ borderRadius: 0 }}
                    onClick={() => navigator.clipboard?.writeText(newKey)}>
                    Copy key
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                <input className={`${field} flex-1 min-w-[12rem]`} style={{ borderRadius: 0 }} placeholder="Label, e.g. Canon 5D FTP"
                  value={keyLabel} onChange={e => setKeyLabel(e.target.value)} />
                <button className={primary} style={{ borderRadius: 0 }} disabled={busy}
                  onClick={() => eventAction('mint-key', { label: keyLabel })}>
                  New key
                </button>
              </div>

              {activeKeys.length === 0 ? (
                <p className="text-white/30 text-xs text-left">No active keys.</p>
              ) : (
                <div className="space-y-2">
                  {activeKeys.map(k => (
                    <div key={k.id} className="bg-black p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderRadius: 0 }}>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.15em]">{k.label || 'Unlabelled'}</p>
                        <p className="text-white/40 text-[10px] tracking-wide mt-1">
                          {k.key_prefix}… · {k.upload_count} sent
                          {k.last_used_at && ` · last ${new Date(k.last_used_at).toLocaleTimeString()}`}
                        </p>
                      </div>
                      <button className={danger} style={{ borderRadius: 0 }} disabled={busy}
                        onClick={() => window.confirm('Revoke this key? The uploader using it stops working.') && eventAction('revoke-key', { keyId: k.id })}>
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Publish / delete stay in reach however far down the inbox you are.
          Fixed rather than sticky: body's overflow-x: hidden stops sticky
          working site-wide. bottom-16 clears the admin music player, which
          AdminLayout pins to bottom-0 on every admin page — its own pop-ups
          sit at bottom-16 for the same reason. */}
      {selected.size > 0 && (
        // pr-20 on phones keeps Publish clear of the round player button that
        // floats bottom-right on every page.
        <div className="fixed bottom-16 left-0 right-0 z-50 pl-4 pr-20 md:px-8 flex justify-center pointer-events-none">
          <div className="bg-zinc-950/95 backdrop-blur-2xl w-full max-w-6xl px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 pointer-events-auto"
            style={{ borderRadius: 0 }}>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">
              {selected.size} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button className={danger} style={{ borderRadius: 0 }} disabled={busy}
                onClick={() => act('discard')}>
                Delete {selected.size}
              </button>
              <button className={primary} style={{ borderRadius: 0 }} disabled={busy}
                onClick={() => act('publish')}>
                Publish {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={closeView}>
          {viewing.url ? (
            <img src={viewing.url} alt="" className="max-w-full max-h-[calc(100vh-6rem)] object-contain" />
          ) : (
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Loading</p>
          )}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2" onClick={e => e.stopPropagation()}>
            <button className={selected.has(viewing.fileId) ? primary : secondary} style={{ borderRadius: 0 }}
              onClick={() => toggle(viewing.fileId)}>
              {selected.has(viewing.fileId) ? 'Selected' : 'Select'}
            </button>
            <button className={secondary} style={{ borderRadius: 0 }} onClick={closeView}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
