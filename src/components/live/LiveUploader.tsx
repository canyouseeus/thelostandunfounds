/**
 * Send photos from a phone's camera roll straight into a live gallery.
 *
 * No review step: these are hand-picked, so ingest-complete is told to
 * publish them on arrival. (Automatic camera sends, where every frame
 * arrives unseen, are what the review inbox is for.)
 *
 * Works from the camera roll on purpose: Canon Camera Connect, Fujifilm XApp,
 * Nikon SnapBridge, Sony Creators' App and the like all drop the camera's
 * frames into the phone's photos, so the phone is the bridge and no laptop is
 * needed. A web page cannot watch the camera roll on its own — pick a batch,
 * it sends them.
 *
 * Each photo: ingest-start opens a Drive upload session, the bytes go to it,
 * ingest-complete publishes it. The bytes try Google directly
 * first; if the browser is not allowed to (the session URL is cross-origin),
 * they go through /api/gallery/ingest-chunk 4MB at a time instead, and the
 * rest of the batch skips straight to that.
 *
 * Auth is either an ingest key (the photographer's upload link) or, with no
 * key, the signed-in admin session that installApiAuth attaches.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useRef, useState } from 'react'

const CONCURRENCY = 2
// 16 × 256 KiB: a Drive chunk must be a multiple of 256 KiB, and this stays
// under Vercel's request body limit. Mirrors RELAY_CHUNK_BYTES on the server.
const RELAY_CHUNK_BYTES = 16 * 256 * 1024

type ItemState = 'queued' | 'sending' | 'done' | 'failed'
interface Item {
  id: string
  file: File
  state: ItemState
  progress: number
  error?: string
}

class CorsBlocked extends Error {}

const btn = 'px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40'

export default function LiveUploader({ uploadKey, slug, onSent }: {
  /** A tlu_live_ key. Omit to upload as the signed-in admin (then slug is required). */
  uploadKey?: string
  slug?: string
  onSent?: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const relayOnly = useRef(false)

  const authHeaders = (): Record<string, string> => (uploadKey ? { Authorization: `Bearer ${uploadKey}` } : {})

  const patch = (id: string, change: Partial<Item>) =>
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...change } : it)))

  async function post<T>(route: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`/api/gallery/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(slug ? { ...body, slug } : body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`)
    return json as T
  }

  function putDirect(url: string, file: File, onProgress: (p: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url)
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const id = JSON.parse(xhr.responseText).id
            if (id) return resolve(id)
          } catch { /* fall through */ }
          return reject(new Error('Google Drive returned no file id.'))
        }
        reject(new Error(`Google Drive refused the upload (${xhr.status}).`))
      }
      // Status 0 with no response is the browser refusing the cross-origin
      // request, not Google refusing the file.
      xhr.onerror = () => reject(xhr.status === 0 ? new CorsBlocked() : new Error('Network error.'))
      xhr.send(file)
    })
  }

  async function putRelayed(url: string, file: File, onProgress: (p: number) => void): Promise<string> {
    let offset = 0
    while (offset < file.size) {
      const end = Math.min(offset + RELAY_CHUNK_BYTES, file.size)
      const params = new URLSearchParams({ session: url })
      if (slug) params.set('slug', slug)
      const res = await fetch(`/api/gallery/ingest-chunk?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-content-range': `bytes ${offset}-${end - 1}/${file.size}`,
          ...authHeaders(),
        },
        body: file.slice(offset, end),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`)
      if (json.done) {
        onProgress(1)
        return json.fileId
      }
      offset = typeof json.nextOffset === 'number' ? json.nextOffset : end
      onProgress(offset / file.size)
    }
    throw new Error('Upload ended without a file id.')
  }

  async function send(item: Item) {
    patch(item.id, { state: 'sending', progress: 0, error: undefined })
    const onProgress = (p: number) => patch(item.id, { progress: p })
    try {
      const { uploadUrl } = await post<{ uploadUrl: string }>('ingest-start', {
        fileName: item.file.name,
        mimeType: item.file.type || 'image/jpeg',
        size: item.file.size,
      })
      let fileId: string | null = null
      if (!relayOnly.current) {
        try {
          fileId = await putDirect(uploadUrl, item.file, onProgress)
        } catch (err) {
          if (!(err instanceof CorsBlocked)) throw err
          relayOnly.current = true
        }
      }
      if (!fileId) fileId = await putRelayed(uploadUrl, item.file, onProgress)
      await post('ingest-complete', { fileId, publish: true })
      patch(item.id, { state: 'done', progress: 1 })
    } catch (err: any) {
      patch(item.id, { state: 'failed', error: err?.message || 'Upload failed.' })
    }
  }

  async function run(queue: Item[]) {
    setRunning(true)
    const pending = [...queue]
    const worker = async () => {
      while (pending.length) await send(pending.shift()!)
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker))
    setRunning(false)
    onSent?.()
  }

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return
    const added: Item[] = Array.from(files)
      .filter(f => f.type.startsWith('image/') || f.type === '')
      .map(f => ({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, file: f, state: 'queued', progress: 0 }))
    setItems(prev => [...added, ...prev])
    if (inputRef.current) inputRef.current.value = ''
    run(added)
  }

  const retry = () => {
    const failed = items.filter(it => it.state === 'failed')
    if (failed.length) run(failed)
  }

  const done = items.filter(it => it.state === 'done').length
  const failed = items.filter(it => it.state === 'failed').length
  const active = items.filter(it => it.state === 'sending' || it.state === 'queued').length

  return (
    <div className="text-left">
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => pick(e.target.files)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} bg-white text-black hover:bg-white/10 hover:text-white`}
          style={{ borderRadius: 0 }} onClick={() => inputRef.current?.click()}>
          Choose photos
        </button>
        {failed > 0 && !running && (
          <button type="button" className={`${btn} bg-white/10 text-white hover:bg-white hover:text-black`}
            style={{ borderRadius: 0 }} onClick={retry}>
            Retry {failed} failed
          </button>
        )}
        {items.length > 0 && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            {done} live{active ? ` · ${active} sending` : ''}{failed ? ` · ${failed} failed` : ''}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-1 max-h-64 overflow-y-auto">
          {items.map(it => (
            <li key={it.id} className="bg-white/5 px-3 py-2" style={{ borderRadius: 0 }}>
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.15em]">
                <span className="truncate text-white/70">{it.file.name}</span>
                <span className={
                  it.state === 'done' ? 'text-green-400' : it.state === 'failed' ? 'text-red-400' : 'text-white/50'
                }>
                  {it.state === 'done' ? 'Live' : it.state === 'failed' ? 'Failed'
                    : it.state === 'queued' ? 'Waiting' : `${Math.round(it.progress * 100)}%`}
                </span>
              </div>
              {it.state === 'sending' && (
                <div className="mt-1 h-0.5 bg-white/10">
                  <div className="h-0.5 bg-white" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                </div>
              )}
              {it.error && <p className="mt-1 text-[10px] text-red-400 normal-case tracking-normal">{it.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Shown under the uploader wherever a photographer (not the owner) sends photos. */
export function UploadTermsNotice() {
  return (
    <p className="mt-3 text-[11px] text-white/40 normal-case tracking-normal">
      By sending photos you agree to the{' '}
      <a href="/terms/photographers" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
        Photographer Terms
      </a>
      , including our right to edit, hide or delete any upload.
    </p>
  )
}
