import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Move a gallery's files into a folder of their own.
 *
 * A gallery must never point at a folder that contains other shoots. The
 * sync walks subfolders, so pointing a library at a client's parent folder
 * makes it claim every shoot beneath it — and because a photo row belongs to
 * one library, claiming them MOVES them out of the gallery they were in.
 * That silently emptied a delivered gallery: 39 photos left the first shoot's
 * library and reappeared in the second's.
 *
 * Creating the subfolder by hand and dragging files is the step that keeps
 * going wrong, so this does both: cuts a subfolder under the parent and
 * re-parents the given files into it.
 *
 * Re-parenting rather than re-uploading, deliberately. The bytes are already
 * in Drive; uploading them again would double the client's storage and leave
 * the originals loose in the parent for the next sync to find.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { slug, parentFolderId, folderName, repointLibrary = true } = (req.body || {}) as {
    slug?: string
    parentFolderId?: string
    folderName?: string
    repointLibrary?: boolean
  }

  if (!slug) return res.status(400).json({ error: 'slug is required' })
  if (!parentFolderId) return res.status(400).json({ error: 'parentFolderId is required' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })

  try {
    const supabase = createClient(url, key)

    const { data: library } = await supabase
      .from('photo_libraries')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (!library) return res.status(404).json({ error: `No gallery with slug ${slug}` })

    // Only this library's own files move. Anything else under the parent —
    // another shoot's folder, the client's own uploads — is left alone.
    const { data: photos } = await supabase
      .from('photos')
      .select('google_drive_file_id')
      .eq('library_id', library.id)

    const fileIds = (photos || []).map(p => p.google_drive_file_id).filter(Boolean) as string[]
    if (fileIds.length === 0) {
      return res.status(400).json({ error: 'That gallery has no photos to move' })
    }

    const drive = await getDrive()
    const name = folderName || library.name || slug

    // Reuse a subfolder of this name if one is already there, so a re-run
    // does not leave a trail of near-identical folders.
    const escaped = name.replace(/'/g, "\\'")
    const { data: found } = await drive.files.list({
      q: `name = '${escaped}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    })

    let folderId = found.files?.[0]?.id
    let folderCreated = false
    if (!folderId) {
      const created = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
      })
      folderId = created.data.id!
      folderCreated = true
    }

    let moved = 0
    let alreadyThere = 0
    const failures: Array<{ fileId: string; error: string }> = []

    for (const fileId of fileIds) {
      try {
        const current = await drive.files.get({ fileId, fields: 'parents' })
        const parents = current.data.parents || []
        if (parents.includes(folderId)) {
          alreadyThere++
          continue
        }
        await drive.files.update({
          fileId,
          addParents: folderId,
          removeParents: parents.join(','),
          fields: 'id, parents',
        })
        moved++
      } catch (err: any) {
        failures.push({ fileId, error: err?.message || 'move failed' })
      }
    }

    if (repointLibrary && failures.length === 0) {
      await supabase
        .from('photo_libraries')
        .update({ google_drive_folder_id: folderId })
        .eq('id', library.id)
    }

    return res.status(200).json({
      success: failures.length === 0,
      folderId,
      folderCreated,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      moved,
      alreadyThere,
      failed: failures.length,
      failures: failures.slice(0, 10),
      // Repointing is skipped on any failure — a library pointing at a folder
      // that holds only some of its photos loses the rest on the next sync.
      libraryRepointed: repointLibrary && failures.length === 0,
    })
  } catch (err: any) {
    console.error('[drive-organize] failed:', err)
    return res.status(500).json({ error: err?.message || 'Organize failed' })
  }
}
