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
    if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`)
    return json as T
  }

  function putDirect(url: string): Promise<string> {
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
