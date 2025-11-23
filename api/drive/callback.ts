import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Google Drive OAuth Callback Handler
 * Exchanges authorization code for access token
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>${error}</p>
          <script>
            window.opener?.postMessage({ type: 'drive_auth_error', error: '${error}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `)
  }

  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Invalid Request</h1>
          <p>Missing authorization code or state</p>
          <script>
            window.opener?.postMessage({ type: 'drive_auth_error', error: 'Invalid request' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin || 'https://thelostandunfounds.com'}/api/drive/callback`

  if (!clientId || !clientSecret) {
    return res.status(500).send(`
      <html>
        <body>
          <h1>Configuration Error</h1>
          <p>Google Drive API credentials not configured</p>
          <script>
            window.opener?.postMessage({ type: 'drive_auth_error', error: 'Configuration error' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token } = tokenData

    // Store tokens securely (in production, use encrypted cookies or session storage)
    // For now, we'll return them to the client to store in localStorage
    // In production, you'd want to store these server-side with user session

    return res.send(`
      <html>
        <body>
          <h1>Authentication Successful</h1>
          <p>You can close this window.</p>
          <script>
            window.opener?.postMessage({ 
              type: 'drive_auth_success', 
              accessToken: '${access_token}',
              refreshToken: '${refresh_token || ''}'
            }, '*');
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `)
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Failed</h1>
          <p>${error.message || 'Unknown error occurred'}</p>
          <script>
            window.opener?.postMessage({ type: 'drive_auth_error', error: '${error.message || 'Unknown error'}' }, '*');
            window.close();
          </script>
        </body>
      </html>
    `)
  }
}
