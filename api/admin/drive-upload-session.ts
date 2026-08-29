import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'

/**
 * Open a Google Drive resumable upload session and hand back the session URI.
 *
 * Vercel caps a request body at ~4.5MB, so `gallery-upload` can only carry a
 * photo. A video from a shoot is tens of megabytes and has nowhere to go:
 * `drive-ingest` needs a public https URL, which a file sitting on someone's
 * machine does not have, and the Drive connector available to an agent takes
 * base64 in the request, which caps out far below a single clip.
 *
 * The way past it is to not send the bytes through Vercel at all. Drive's
 * resumable protocol hands out a session URI that already carries its own
 * short-lived credential, so the caller PUTs the file straight to Google —
 * this function only mints the session. A 21MB video and a 2GB one cost this
 * endpoint exactly the same.
 *
 * The session URI is a bearer capability, but a narrow one: it can only append
 * bytes to the single file just created, in the folder named here, and it dies
 * within about a week. It is not a Drive token and cannot read anything.
 *
 * The caller finishes by PUTting the bytes with a Content-Range header:
 *
 *   curl -X PUT "$SESSION_URI" \
 *     -H "Content-Range: bytes 0-22682615/22682616" \
 *     --data-binary @clip.mov
 *
 * Then POST /api/admin/sync-library with the gallery slug, as with photos.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  const secret = req.headers['x-admin-secret']
  if (secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET) return true
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

async function getAccessToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env
  if (GOOGLE_REFRESH_TOKEN && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
    oauth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
    const { token } = await oauth.getAccessToken()
    if (token) return token
  }
  // The service account owns a different Drive, so it can only write where the
  // destination folder has been shared with it explicitly. Kept as the fallback
  // because Vercel scopes env vars per environment and a preview deployment can
  // be missing the OAuth refresh token that production has.
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n').replace(/"/g, '').trim()
  if (!email || !key) throw new Error('No Google credentials in this environment')
  const jwt = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive'] })
  const { access_token } = await jwt.authorize()
  if (!access_token) throw new Error('Service account returned no access token')
  return access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { fileName, parentId, mimeType, sizeBytes } = (req.body || {}) as {
    fileName?: string
    parentId?: string
    mimeType?: string
    sizeBytes?: number
  }

  if (!fileName || !parentId || !mimeType) {
    return res.status(400).json({ error: 'fileName, parentId and mimeType are required' })
  }

  // A slash reads as a path to Drive and a quote breaks the sync's own queries.
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, '_')

  try {
    const token = await getAccessToken()
    const drive = google.drive({
      version: 'v3',
      auth: new google.auth.OAuth2(),
      headers: { Authorization: `Bearer ${token}` },
    })

    // Re-running an upload must not leave two files with one name in the
    // folder; Drive allows it and the gallery would show the clip twice.
    const escaped = safeName.replace(/'/g, "\\'")
    const { data: dupes } = await drive.files.list({
      q: `name = '${escaped}' and '${parentId}' in parents and trashed = false`,
      fields: 'files(id,name,size)',
    })
    if (dupes.files && dupes.files.length > 0) {
      const hit = dupes.files[0]
      return res.status(200).json({
        skipped: 'already present',
        fileId: hit.id,
        name: hit.name,
        size: Number(hit.size ?? 0),
      })
    }

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          ...(sizeBytes ? { 'X-Upload-Content-Length': String(sizeBytes) } : {}),
          'X-Upload-Content-Type': mimeType,
        },
        body: JSON.stringify({ name: safeName, parents: [parentId], mimeType }),
      }
    )

    if (!initRes.ok) {
      const detail = await initRes.text().catch(() => '')
      return res.status(502).json({
        error: `Drive refused the upload session (${initRes.status})`,
        detail: detail.slice(0, 500),
      })
    }

    const sessionUri = initRes.headers.get('location')
    if (!sessionUri) {
      return res.status(502).json({ error: 'Drive returned no session URI' })
    }

    return res.status(200).json({
      sessionUri,
      name: safeName,
      parentId,
      mimeType,
      // Said plainly because a resumable PUT without Content-Range silently
      // creates a zero-byte file rather than failing.
      howTo: `PUT the bytes to sessionUri with header: Content-Range: bytes 0-<size-1>/<size>`,
    })
  } catch (err: any) {
    console.error('[drive-upload-session] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to open upload session' })
  }
}
