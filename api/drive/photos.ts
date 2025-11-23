import type { VercelRequest, VercelResponse } from '@vercel/node'

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  webViewLink?: string
  webContentLink?: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  imageMediaMetadata?: {
    width?: number
    height?: number
  }
}

interface GoogleDriveListResponse {
  files: GoogleDriveFile[]
  nextPageToken?: string
}

/**
 * Fetch photos from Google Drive
 * Requires access token in Authorization header or query parameter
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get access token from Authorization header or query parameter
  const authHeader = req.headers.authorization
  const accessToken = authHeader?.replace('Bearer ', '') || req.query.token as string

  if (!accessToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Access token required. Please authenticate first.'
    })
  }

  try {
    // Get query parameters
    const pageToken = req.query.pageToken as string | undefined
    const folderId = req.query.folderId as string | undefined
    const pageSize = parseInt(req.query.pageSize as string || '50')
    const mimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ]

    // Build query for images
    let query = `mimeType in ('${mimeTypes.join("', '")}') and trashed=false`
    
    // If folderId is provided, search within that folder
    if (folderId) {
      query += ` and '${folderId}' in parents`
    }

    // Build API URL
    let apiUrl = `https://www.googleapis.com/drive/v3/files?` +
      `q=${encodeURIComponent(query)}&` +
      `fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,createdTime,modifiedTime,imageMediaMetadata)&` +
      `pageSize=${pageSize}&` +
      `orderBy=modifiedTime desc`

    if (pageToken) {
      apiUrl += `&pageToken=${encodeURIComponent(pageToken)}`
    }

    // Fetch files from Google Drive
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
          message: 'Access token expired or invalid. Please re-authenticate.',
          needsAuth: true
        })
      }

      throw new Error(`Google Drive API error: ${driveResponse.status} ${errorText}`)
    }

    const data: GoogleDriveListResponse = await driveResponse.json()

    // Transform files to include direct image URLs
    const photos = data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      imageUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
      webViewLink: file.webViewLink,
      size: file.size,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      width: file.imageMediaMetadata?.width,
      height: file.imageMediaMetadata?.height,
    }))

    return res.status(200).json({
      photos,
      nextPageToken: data.nextPageToken,
      total: photos.length,
    })
  } catch (error: any) {
    console.error('Error fetching Google Drive photos:', error)
    return res.status(500).json({
      error: 'Failed to fetch photos',
      message: error.message || 'Unknown error occurred'
    })
  }
}
