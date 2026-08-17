import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Trash a redundant Drive folder: a duplicate copy of a shoot, a staging
 * folder left behind by an upload.
 *
 * Trash, never delete. A folder that turns out to have been the only copy of
 * something is recoverable for 30 days; a permanent delete is not, and no
 * amount of checking justifies making that mistake unrecoverable.
 *
 * The guard is the point of the endpoint: it refuses if any file inside is
 * referenced by a photos row. A gallery serves images straight from Drive by
 * file id, so trashing a referenced file does not merely tidy up; it breaks
 * a delivered gallery, and the rows keep pointing at files that no longer
 * resolve. Deleting the wrong one of two identical-looking copies is exactly
 * the mistake that is easy to make by eye.
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

type DriveLike = Awaited<ReturnType<typeof getDrive>>

async function collectFiles(drive: DriveLike, folderId: string, depth = 0): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  if (depth > 3) return []
  const out: Array<{ id: string; name: string; mimeType: string }> = []
  let pageToken: string | undefined
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken,
    })
    for (const f of res.data.files || []) {
      if (!f.id) continue
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        out.push(...await collectFiles(drive, f.id, depth + 1))
      } else {
        out.push({ id: f.id, name: f.name || '', mimeType: f.mimeType || '' })
      }
    }
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { folderId, parentFolderId, folderName, dryRun = false, list = false } = (req.body || {}) as {
    folderId?: string
    parentFolderId?: string
    folderName?: string
    dryRun?: boolean
    list?: boolean
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })

  try {
    const drive = await getDrive()

    // Naming a folder to delete means knowing what is actually there. Guessing
    // at a name is how the wrong folder gets picked.
    if (list) {
      const target = folderId || parentFolderId
      if (!target) return res.status(400).json({ error: 'list needs folderId or parentFolderId' })
      const { data } = await drive.files.list({
        q: `'${target}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size)',
        pageSize: 200,
        orderBy: 'folder,name',
      })
      const entries = data.files || []
      return res.status(200).json({
        success: true,
        parentId: target,
        folders: entries.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
          .map(f => ({ id: f.id, name: f.name })),
        looseFileCount: entries.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').length,
      })
    }

    let targetId = folderId

    if (!targetId) {
      if (!parentFolderId || !folderName) {
        return res.status(400).json({ error: 'Provide folderId, or parentFolderId plus folderName' })
      }
      const escaped = folderName.replace(/'/g, "\\'")
      const { data: found } = await drive.files.list({
        q: `name = '${escaped}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 2,
      })
      if (!found.files?.length) {
        return res.status(404).json({ error: `No folder named ${folderName} under that parent` })
      }
      if (found.files.length > 1) {
        return res.status(409).json({ error: `More than one folder named ${folderName}; pass folderId to be explicit` })
      }
      targetId = found.files[0].id!
    }

    const meta = await drive.files.get({ fileId: targetId, fields: 'id, name, mimeType, parents' })
    if (meta.data.mimeType !== 'application/vnd.google-apps.folder') {
      return res.status(400).json({ error: 'That id is not a folder' })
    }

    const files = await collectFiles(drive, targetId)
    const ids = files.map(f => f.id)

    // Anything a gallery serves is off limits.
    const supabase = createClient(url, key)
    let referenced: Array<{ google_drive_file_id: string; library_id: string | null }> = []
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase
        .from('photos')
        .select('google_drive_file_id, library_id')
        .in('google_drive_file_id', ids.slice(i, i + 200))
      if (data) referenced = referenced.concat(data as any)
    }

    if (referenced.length > 0) {
      return res.status(409).json({
        error: 'Refusing to trash: a gallery serves files from this folder',
        folderId: targetId,
        folderName: meta.data.name,
        fileCount: files.length,
        referencedCount: referenced.length,
        sampleReferenced: referenced.slice(0, 5),
      })
    }

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        wouldTrash: { folderId: targetId, folderName: meta.data.name, fileCount: files.length },
      })
    }

    await drive.files.update({ fileId: targetId, requestBody: { trashed: true } })

    return res.status(200).json({
      success: true,
      trashed: { folderId: targetId, folderName: meta.data.name, fileCount: files.length },
      note: 'Moved to Drive trash: recoverable for 30 days',
    })
  } catch (err: any) {
    console.error('[drive-cleanup] failed:', err)
    return res.status(500).json({ error: err?.message || 'Cleanup failed' })
  }
}
