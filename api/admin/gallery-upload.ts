import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Upload one image into a gallery's Google Drive folder.
 *
 * Delivering a shoot meant a human moving files by hand: download the
 * transfer, unzip it, drag the images into Drive, then sync. Everything
 * either side of that is automated, so the manual step in the middle is
 * where deliveries stall, and it is the step that put a zip into Drive
 * instead of images, which synced as zero photos because the sync only
 * ingests image/*.
 *
 * Drive rather than Supabase Storage on purpose: photos.google_drive_file_id
 * is NOT NULL with no default, so a storage-only photo row cannot be
 * inserted. The gallery is a Drive-backed system and this follows it.
 *
 * One image per request: Vercel caps a request body at ~4.5MB, and a shoot
 * is far larger than that. The caller loops. Rows are not written here: after
 * the images land, POST /api/admin/sync-library with the slug and the normal
 * sync builds the photo rows exactly as it does for every other gallery.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true
  }
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

async function getDrive() {
  const { google } = await import('googleapis')
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Drive credentials are not configured')
  }
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
  return google.drive({ version: 'v3', auth })
}

export const config = {
  api: {
    // The image arrives as a raw binary body; the JSON parser would corrupt it.
    bodyParser: false,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret, X-Gallery-Slug, X-File-Name')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const slug = (req.headers['x-gallery-slug'] as string || '').trim()
  const rawName = (req.headers['x-file-name'] as string || '').trim()
  if (!slug) return res.status(400).json({ error: 'X-Gallery-Slug is required' })

  const contentType = ((req.headers['content-type'] as string) || '').split(';')[0].trim()
  const ext = CONTENT_TYPE_EXT[contentType]
  if (!ext) {
    return res.status(400).json({ error: `Unsupported type ${contentType || '(none)'}; use JPEG, PNG, or WebP` })
  }

  // Drive is happy with almost anything, but a name with a slash reads as a
  // path and a name with quotes breaks the sync's own queries.
  const name = (rawName.replace(/[^A-Za-z0-9._-]/g, '_') || `photo-${Date.now()}.${ext}`)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })

  try {
    const supabase = createClient(url, key)
    const { data: library, error: libErr } = await supabase
      .from('photo_libraries')
      .select('id, name, slug, google_drive_folder_id, gdrive_folder_id')
      .eq('slug', slug)
      .maybeSingle()

    if (libErr) throw new Error(libErr.message)
    if (!library) return res.status(404).json({ error: `No gallery with slug ${slug}` })

    const drive = await getDrive()
    let folderId = library.google_drive_folder_id || library.gdrive_folder_id || null
    let folderCreated = false

    if (!folderId) {
      const parent = process.env.CLIENT_GALLERIES_DRIVE_FOLDER_ID || undefined
      const folder = await drive.files.create({
        requestBody: {
          name: library.name || slug,
          mimeType: 'application/vnd.google-apps.folder',
          ...(parent ? { parents: [parent] } : {}),
        },
        fields: 'id',
      })
      folderId = folder.data.id!
      folderCreated = true
      await supabase
        .from('photo_libraries')
        .update({ google_drive_folder_id: folderId })
        .eq('id', library.id)
    }

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', resolve)
      req.on('error', reject)
    })
    const buffer = Buffer.concat(chunks)
    if (buffer.length === 0) return res.status(400).json({ error: 'Empty body' })

    // Re-uploading the same shoot must not double the gallery. Drive allows
    // two files with one name in a folder, and the sync would ingest both.
    const escaped = name.replace(/'/g, "\\'")
    const { data: existing } = await drive.files.list({
      q: `name = '${escaped}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, size)',
      pageSize: 1,
    })
    const already = existing.files?.[0]
    if (already) {
      return res.status(200).json({
        success: true,
        skipped: true,
        reason: 'A file with this name is already in the folder',
        fileId: already.id,
        name,
        folderId,
      })
    }

    const { Readable } = await import('node:stream')
    const created = await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType: contentType, body: Readable.from(buffer) },
      fields: 'id, name, size',
    })

    return res.status(200).json({
      success: true,
      skipped: false,
      fileId: created.data.id,
      name: created.data.name,
      bytes: buffer.length,
      folderId,
      folderCreated,
    })
  } catch (err: any) {
    console.error('[gallery-upload] failed:', err)
    return res.status(500).json({ error: err?.message || 'Upload failed' })
  }
}
