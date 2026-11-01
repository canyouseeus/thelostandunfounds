/**
 * Send one photo into a gallery through the Drive ingest pipeline:
 * ingest-start opens a Drive upload session, the bytes go to it, and
 * ingest-complete publishes the photo (named and live at once).
 *
 * The bytes try Google directly first; if the browser is not allowed to (the
 * session URL is cross-origin), they go through /api/gallery/ingest-chunk 4MB
 * at a time instead, and `relay.only` flips so the rest of the batch skips
 * straight to that.
 *
 * Auth is either an ingest key (a photographer's upload link) or, with no key,
 * the signed-in session that installApiAuth attaches (then slug is required).
 *
 * Shared by LiveUploader (camera roll → live gallery) and the Direct Upload
 * option on Create/Edit Gallery.
 */

// 16 × 256 KiB: a Drive chunk must be a multiple of 256 KiB, and this stays
// under Vercel's request body limit. Mirrors RELAY_CHUNK_BYTES on the server.
const RELAY_CHUNK_BYTES = 16 * 256 * 1024

class CorsBlocked extends Error {}

/** A refusal that retrying cannot fix (bad file, too big, not allowed). */
export class UploadRefused extends Error {}

// No upload progress for this long means the transfer is dead — usually the
// phone paused the page when its owner switched apps. Abort and retry.
const STALL_MS = 45_000

export interface SendOptions {
  file: File
  slug?: string
  uploadKey?: string
  mature?: boolean
  onProgress?: (fraction: number) => void
  /** Shared across a batch: once one upload needs the relay, the rest use it too. */
  relay: { only: boolean }
}

export async function sendToGallery({ file, slug, uploadKey, mature = false, onProgress = () => {}, relay }: SendOptions): Promise<void> {
  const authHeaders: Record<string, string> = uploadKey ? { Authorization: `Bearer ${uploadKey}` } : {}

  async function post<T>(route: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`/api/gallery/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(slug ? { ...body, slug } : body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = json.error || `Upload failed (${res.status})`
      // 4xx from our own API is a decision, not a hiccup: do not retry it.
      throw res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429
        ? new UploadRefused(message)
        : new Error(message)
    }
    return json as T
  }

  function putDirect(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url)
      let stall: ReturnType<typeof setTimeout> | undefined
      const arm = () => {
        clearTimeout(stall)
        stall = setTimeout(() => xhr.abort(), STALL_MS)
      }
      xhr.onabort = () => reject(new Error('Upload stalled.'))
      xhr.onloadend = () => clearTimeout(stall)
      xhr.upload.onprogress = e => { arm(); if (e.lengthComputable) onProgress(e.loaded / e.total) }
      arm()
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

  async function putRelayed(url: string): Promise<string> {
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
          ...authHeaders,
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

  const { uploadUrl } = await post<{ uploadUrl: string }>('ingest-start', {
    fileName: file.name,
    mimeType: file.type || 'image/jpeg',
    size: file.size,
  })
  let fileId: string | null = null
  if (!relay.only) {
    try {
      fileId = await putDirect(uploadUrl)
    } catch (err) {
      if (!(err instanceof CorsBlocked)) throw err
      relay.only = true
    }
  }
  if (!fileId) fileId = await putRelayed(uploadUrl)
  await post('ingest-complete', { fileId, publish: true, mature })
  onProgress(1)
}

function untilVisible(): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') return Promise.resolve()
  return new Promise(resolve => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', onChange)
      resolve()
    }
    document.addEventListener('visibilitychange', onChange)
  })
}

/**
 * sendToGallery, made to survive switching apps on a phone.
 *
 * A web page cannot upload in the background on iPhone: Safari pauses it
 * seconds after you leave, and the transfer dies. So a photo that fails for
 * a transient reason (network, stalled transfer, Google 5xx) waits until the
 * page is on screen again and starts over — it is a ~10MB photo, so starting
 * over costs little. A refusal from our own API (UploadRefused) is final.
 */
export async function sendToGalleryResilient(opts: SendOptions, attempts = 5): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    await untilVisible()
    try {
      return await sendToGallery(opts)
    } catch (err) {
      if (err instanceof UploadRefused || attempt >= attempts) throw err
      opts.onProgress?.(0)
      await untilVisible()
      await new Promise(r => setTimeout(r, Math.min(1000 * attempt, 5000)))
    }
  }
}
