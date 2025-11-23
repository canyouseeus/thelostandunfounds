import type { VercelRequest, VercelResponse } from '@vercel/node'

interface GoogleDriveFolder {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  createdTime?: string
  modifiedTime?: string
}

interface GoogleDriveListResponse {
  files: GoogleDriveFolder[]
  nextPageToken?: string
}

/**
 * List folders from Google Drive
 * Useful for organizing photos by folder
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const accessToken = authHeader?.replace('Bearer ', '') || req.query.token as string

  if (!accessToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Access token required'
    })
  }

  try {
    const parentFolderId = req.query.parentId as string | undefined
    const pageSize = parseInt(req.query.pageSize as string || '100')

    // Query for folders (mimeType = 'application/vnd.google-apps.folder')
    let query = "mimeType = 'application/vnd.google-apps.folder' and trashed=false"
    
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`
    }

    let apiUrl = `https://www.googleapis.com/drive/v3/files?` +
      `q=${encodeURIComponent(query)}&` +
      `fields=nextPageToken,files(id,name,mimeType,webViewLink,createdTime,modifiedTime)&` +
      `pageSize=${pageSize}&` +
      `orderBy=name`

    const driveResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text()
      
      if (driveResponse.status === 401) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Access token expired or invalid',
          needsAuth: true
        })
      }

      throw new Error(`Google Drive API error: ${driveResponse.status} ${errorText}`)
    }

    const data: GoogleDriveListResponse = await driveResponse.json()

    const folders = data.files.map(folder => ({
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
      createdTime: folder.createdTime,
      modifiedTime: folder.modifiedTime,
    }))

    return res.status(200).json({
      folders,
      nextPageToken: data.nextPageToken,
      total: folders.length,
    })
  } catch (error: any) {
    console.error('Error fetching Google Drive folders:', error)
    return res.status(500).json({
      error: 'Failed to fetch folders',
      message: error.message || 'Unknown error occurred'
    })
  }
}
