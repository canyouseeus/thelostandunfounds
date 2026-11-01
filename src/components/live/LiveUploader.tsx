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
 * Each photo goes through sendToGallery: ingest-start opens a Drive upload
 * session, the bytes go to it (directly, or relayed 4MB at a time through
 * /api/gallery/ingest-chunk), ingest-complete publishes it.
 *
 * Auth is either an ingest key (the photographer's upload link) or, with no
 * key, the signed-in admin session that installApiAuth attaches.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useRef, useState } from 'react'
import { sendToGalleryResilient } from './sendToGallery'

const CONCURRENCY = 2

type ItemState = 'queued' | 'sending' | 'done' | 'failed'
interface Item {
  id: string
  file: File
  state: ItemState
  progress: number
  error?: string
  /** Marked 18+ when it was chosen. */
  mature: boolean
}

const btn = 'px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-40'

export default function LiveUploader({ uploadKey, slug, onSent }: {
  /** A tlu_live_ key. Omit to upload as the signed-in admin (then slug is required). */
  uploadKey?: string
  slug?: string
  onSent?: () => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  // Ticked before choosing: every photo in that batch is marked 18+ and blurred on the gallery.
  const [mature, setMature] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const relayOnly = useRef({ only: false })

  const patch = (id: string, change: Partial<Item>) =>
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...change } : it)))

  async function send(item: Item) {
    patch(item.id, { state: 'sending', progress: 0, error: undefined })
    const onProgress = (p: number) => patch(item.id, { progress: p })
    try {
      await sendToGalleryResilient({ file: item.file, slug, uploadKey, mature: item.mature, onProgress, relay: relayOnly.current })
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
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type === '')
      .map(f => ({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, file: f, state: 'queued', progress: 0, mature }))
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
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={e => pick(e.target.files)} />
      <label className="flex items-start gap-3 text-xs text-white/70 cursor-pointer mb-3 normal-case tracking-normal">
        <input type="checkbox" className="mt-0.5 accent-white" checked={mature}
          onChange={e => setMature(e.target.checked)} />
        <span>
          These photos contain nudity (18+). They'll be blurred on the gallery until a viewer confirms they're 18 or older.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${btn} bg-white text-black hover:bg-white/10 hover:text-white`}
          style={{ borderRadius: 0 }} onClick={() => inputRef.current?.click()}>
          Choose photos & videos
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

      <p className="mt-2 text-[10px] text-white/40 normal-case tracking-normal">
        Videos up to 1GB (about 2 minutes). Post longer ones to YouTube.
      </p>

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
