/**
 * A photographer's camera on one of their own live galleries.
 *
 * CAMERA LOGIN gives their camera FTP settings for the camera relay
 * (relay/ftp). Every frame the camera sends waits in this gallery's review
 * inbox — a camera sends everything, misfires too — and they publish the
 * keepers or delete the rest, the same as the owner does on /admin/live.
 *
 * Everything goes through /api/gallery/my-live, which only lets them touch
 * galleries they own.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface CameraKey {
  id: string
  key_prefix: string
  label: string | null
  last_used_at: string | null
  upload_count: number
}

interface Pending {
  drive_file_id: string
  file_name: string | null
  received_at: string
}

const POLL_MS = 8000
const PREVIEW_CONCURRENCY = 3
const KEY_PREFIX = 'tlu_live_'
const FTP_RELAY_HOST = (import.meta.env.VITE_FTP_RELAY_HOST as string | undefined) || ''

const btn = 'px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40'
const primary = `${btn} bg-white text-black hover:bg-white/10 hover:text-white`
const secondary = `${btn} bg-white/10 text-white hover:bg-white hover:text-black`
const danger = `${btn} bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white`

async function myLive<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/gallery/my-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json as T
}

export default function MyCameraInbox({ slug }: { slug: string }) {
  const [keys, setKeys] = useState<CameraKey[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewUrls = useRef<Record<string, string>>({})
  const requested = useRef<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const data = await myLive<{ keys: CameraKey[]; pending: Pending[] }>({ action: 'camera', slug })
      setKeys(data.keys)
      setPending(data.pending)
      const ids = new Set(data.pending.map(p => p.drive_file_id))
      setSelected(prev => new Set([...prev].filter(id => ids.has(id))))
    } catch (err: any) {
      setError(err.message)
    }
  }, [slug])

  // Watch the inbox while the tab is visible.
  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const timer = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [load])

  // Thumbnails come from a session-only route, so an <img src> cannot load
  // them directly; fetch a few at a time and show them as object URLs.
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
          const params = new URLSearchParams({ preview: id, slug, size: '400' })
          const res = await fetch(`/api/gallery/my-live?${params}`)
          if (!res.ok) throw new Error(String(res.status))
          const url = URL.createObjectURL(await res.blob())
          previewUrls.current[id] = url
          setPreviews(p => ({ ...p, [id]: url }))
        } catch {
          requested.current.delete(id)
        }
      }
    }
    for (let i = 0; i < PREVIEW_CONCURRENCY; i++) worker()
    return () => { cancelled = true }
  }, [pending, slug])

  useEffect(() => () => {
    for (const url of Object.values(previewUrls.current)) URL.revokeObjectURL(url)
  }, [])

  /** One my-live action, then a refresh. Null when it failed (the error is shown). */
  async function run(body: Record<string, unknown>): Promise<any | null> {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const data = await myLive<any>({ slug, ...body })
      await load()
      return data
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function act(action: 'publish' | 'discard') {
    const ids = [...selected]
    if (!ids.length) return
    if (action === 'discard' && !window.confirm(
      `Delete ${ids.length} photo${ids.length === 1 ? '' : 's'} permanently? They are removed for good.`,
    )) return
    const data = await run({ action, fileIds: ids })
    if (!data) return
    const done = data.published ?? data.discarded ?? 0
    setNotice(`${action === 'publish' ? 'Published' : 'Deleted'} ${done} photo${done === 1 ? '' : 's'}.`)
    const failed = (data.results || []).filter((r: any) => !r.ok)
    if (failed.length) setError(`${failed.length} failed: ${failed[0].error}`)
    setSelected(new Set())
  }

  async function mintLogin() {
    const data = await run({ action: 'camera-login' })
    if (data?.key) setNewKey(data.key)
  }

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const password = newKey ? newKey.replace(KEY_PREFIX, '') : ''

  return (
    <div className="mt-6 text-left">
      <h3 className="text-xs font-black uppercase tracking-[0.25em] mb-2">FROM YOUR CAMERA</h3>
      <p className="text-white/50 text-xs mb-4">
        A camera that sends by FTP (Canon R5, R6 Mark II, R3, R1 and others) can upload every frame on its own, no phone
        needed. Those frames wait below for you to pick the keepers.
      </p>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {notice && <p className="text-green-400 text-xs mb-3">{notice}</p>}

      {newKey ? (
        <div className="bg-white/5 p-4 mb-4" style={{ borderRadius: 0 }}>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-3">
            Type this into your camera now — the password is not shown again
          </p>
          {!FTP_RELAY_HOST && (
            <p className="text-red-400 text-xs mb-3">Camera uploads are not switched on yet. Check back soon.</p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            <dt className="text-white/40 uppercase tracking-[0.15em]">Server</dt>
            <dd className="text-white break-all">{FTP_RELAY_HOST || '—'}</dd>
            <dt className="text-white/40 uppercase tracking-[0.15em]">Port</dt>
            <dd className="text-white">21</dd>
            <dt className="text-white/40 uppercase tracking-[0.15em]">Login name</dt>
            <dd className="text-white">camera</dd>
            <dt className="text-white/40 uppercase tracking-[0.15em]">Password</dt>
            <dd><code className="text-white text-sm tracking-wider break-all">{password}</code></dd>
            <dt className="text-white/40 uppercase tracking-[0.15em]">Passive mode</dt>
            <dd className="text-white">On</dd>
            <dt className="text-white/40 uppercase tracking-[0.15em]">Send</dt>
            <dd className="text-white">JPEG only</dd>
          </dl>
          <div className="flex flex-wrap gap-2 mt-4">
            <button className={secondary} style={{ borderRadius: 0 }}
              onClick={() => navigator.clipboard?.writeText(
                `Server: ${FTP_RELAY_HOST}\nPort: 21\nLogin name: camera\nPassword: ${password}\nPassive mode: On`,
              )}>
              Copy settings
            </button>
            <button className={secondary} style={{ borderRadius: 0 }} onClick={() => setNewKey(null)}>Done</button>
          </div>
        </div>
      ) : (
        <button className={secondary} style={{ borderRadius: 0 }} disabled={busy}
          onClick={mintLogin}>
          Camera login
        </button>
      )}

      {keys.length > 0 && (
        <div className="space-y-2 mt-4">
          {keys.map(k => (
            <div key={k.id} className="bg-white/5 p-3 flex flex-wrap items-center justify-between gap-3" style={{ borderRadius: 0 }}>
              <p className="text-white/50 text-[10px] uppercase tracking-[0.15em]">
                {k.label || 'Login'} · {k.upload_count} sent
                {k.last_used_at && ` · last ${new Date(k.last_used_at).toLocaleTimeString()}`}
              </p>
              <button className={danger} style={{ borderRadius: 0 }} disabled={busy}
                onClick={() => window.confirm('Turn off this login? The camera can no longer send photos with it.')
                  && run({ action: 'revoke-key', keyId: k.id })}>
                Turn off
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
          {pending.length} waiting for review · {selected.size} selected
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={secondary} style={{ borderRadius: 0 }} disabled={!pending.length}
            onClick={() => setSelected(new Set(pending.map(p => p.drive_file_id)))}>
            Select all
          </button>
          <button className={danger} style={{ borderRadius: 0 }} disabled={busy || !selected.size} onClick={() => act('discard')}>
            Delete {selected.size || ''}
          </button>
          <button className={primary} style={{ borderRadius: 0 }} disabled={busy || !selected.size} onClick={() => act('publish')}>
            Publish {selected.size || ''}
          </button>
        </div>
      </div>

      {pending.length === 0 ? (
        <p className="text-white/30 text-xs">Nothing waiting. Frames from your camera show up here within seconds.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
          {pending.map(p => {
            const isSelected = selected.has(p.drive_file_id)
            const src = previews[p.drive_file_id]
            return (
              <button key={p.drive_file_id} type="button" onClick={() => toggle(p.drive_file_id)}
                className={`block aspect-square overflow-hidden p-1 ${isSelected ? 'bg-white' : 'bg-white/5'}`}
                style={{ borderRadius: 0 }} aria-pressed={isSelected} aria-label={`Select ${p.file_name || 'photo'}`}>
                {src ? (
                  <img src={src} alt={p.file_name || ''}
                    className={`w-full h-full object-cover ${isSelected ? 'opacity-100' : 'opacity-80'}`} />
                ) : (
                  <span className="flex w-full h-full items-center justify-center bg-black text-[10px] uppercase tracking-[0.2em] text-white/30">
                    Loading
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
