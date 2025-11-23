import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Google Drive OAuth Authentication Endpoint
 * Initiates OAuth flow and returns auth URL
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin || 'https://thelostandunfounds.com'}/api/drive/callback`
  const scope = 'https://www.googleapis.com/auth/drive.readonly'

  if (!clientId) {
    return res.status(500).json({ 
      error: 'Google Drive API not configured',
      message: 'GOOGLE_CLIENT_ID environment variable is missing'
    })
  }

  // Generate state for CSRF protection
  const state = Buffer.from(JSON.stringify({ 
    timestamp: Date.now(),
    origin: req.headers.origin || 'https://thelostandunfounds.com'
  })).toString('base64')

  // Store state in cookie for verification
  res.setHeader('Set-Cookie', `drive_auth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`)

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(state)}`

  return res.status(200).json({ 
    authUrl,
    message: 'Redirect user to authUrl to authenticate'
  })
}
