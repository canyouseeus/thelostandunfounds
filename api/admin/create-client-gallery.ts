import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a private client gallery, Drive folder and all.
 *
 * Standing up a delivery gallery by hand is four steps across two systems:
 * cut a Drive folder, insert the photo_libraries row, point the row at the
 * folder, and add the client to invited_emails. Miss the last one and the
 * client gets a link that asks them for an email it will never accept.
 * onboard-gallery.ts does not cover this — it is bound to a photographer
 * invitation token and expects the folder to already exist.
 *
 * The Drive folder is created with the owner's OAuth credentials, the same
 * ones api/client-uploads uses, so the folder belongs to the owner's account
 * rather than a service account with no rights to it.
 *
 * Idempotent on slug: calling twice updates the existing gallery instead of
 * raising a second one, and never discards a folder id that already holds
 * photos.
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

async function createDriveFolder(name: string): Promise<{ id: string; url: string }> {
  const drive = await getDrive()
  // CLIENT_GALLERIES_DRIVE_FOLDER_ID keeps delivery folders together; without
  // it the folder lands at the Drive root, which is untidy but still works.
  const parent = process.env.CLIENT_GALLERIES_DRIVE_FOLDER_ID || undefined
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parent ? { parents: [parent] } : {}),
    },
    fields: 'id',
  })
  const id = folder.data.id!
  return { id, url: `https://drive.google.com/drive/folders/${id}` }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const {
    name,
    slug: rawSlug,
    clientEmail,
    folderId: providedFolderId,
    description,
    photographerHandle,
    metadata,
  } = (req.body || {}) as {
    name?: string
    slug?: string
    clientEmail?: string
    folderId?: string
    description?: string
    photographerHandle?: string
    metadata?: Record<string, unknown>
  }

  if (!name) return res.status(400).json({ error: 'name is required' })
  if (!clientEmail) {
    // Without this the gallery is private and reachable by nobody.
    return res.status(400).json({ error: 'clientEmail is required — it is what grants access' })
  }

  const slug = slugify(rawSlug || name)
  if (!slug) return res.status(400).json({ error: 'name did not yield a usable slug' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })
  const supabase = createClient(url, key)

  try {
    const { data: existing } = await supabase
      .from('photo_libraries')
      .select('id, slug, google_drive_folder_id, gdrive_folder_id')
      .eq('slug', slug)
      .maybeSingle()

    // Never cut a second folder for a gallery that already has one — the
    // photos would be in the first and the gallery would read the second.
    let folderId = providedFolderId || existing?.google_drive_folder_id || existing?.gdrive_folder_id || null
    let folderUrl = folderId ? `https://drive.google.com/drive/folders/${folderId}` : null
    let folderCreated = false

    if (!folderId) {
      const folder = await createDriveFolder(name)
      folderId = folder.id
      folderUrl = folder.url
      folderCreated = true
    }

    const row = {
      name,
      slug,
      description: description || null,
      google_drive_folder_id: folderId,
      is_private: true,
      published: true,
      status: 'active',
      // A delivered client gallery is paid for by the invoice, not per photo,
      // and the client owns the commercial use of their own listing photos.
      price: 0,
      commercial_included: true,
      invited_emails: clientEmail,
      photographer_handle: photographerHandle || null,
      metadata: metadata || {},
    }

    let libraryId: string
    if (existing) {
      const { data, error } = await supabase
        .from('photo_libraries')
        .update(row)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error) throw new Error(`Failed to update gallery: ${error.message}`)
      libraryId = data.id
    } else {
      const { data, error } = await supabase
        .from('photo_libraries')
        .insert(row)
        .select('id')
        .single()
      if (error) throw new Error(`Failed to create gallery: ${error.message}`)
      libraryId = data.id
    }

    const site = 'https://www.thelostandunfounds.com'
    return res.status(200).json({
      success: true,
      created: !existing,
      libraryId,
      slug,
      driveFolderId: folderId,
      driveFolderUrl: folderUrl,
      driveFolderCreated: folderCreated,
      galleryUrl: `${site}/gallery/${slug}`,
      accessUrl: `${site}/gallery/${slug}/access`,
      invitedEmail: clientEmail,
      // The photos are not in Drive yet when this runs, so syncing is a
      // separate, deliberate step.
      nextStep: `Put the images in the Drive folder, then POST /api/admin/sync-library with {"slug":"${slug}"}`,
    })
  } catch (err: any) {
    console.error('[create-client-gallery] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create client gallery' })
  }
}
