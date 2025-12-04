import { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getDiscordOAuthUrl,
  exchangeDiscordCode,
  getDiscordUser,
} from '../discord/utils'

/**
 * Discord OAuth2 Handler
 * 
 * Handles Discord OAuth2 authentication flow
 * 
 * GET /api/discord/oauth - Start OAuth flow
 * GET /api/discord/oauth/callback - Handle OAuth callback
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Discord OAuth2 not configured',
        message: 'Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET environment variables',
      })
    }

    // Extract route from path
    const urlPath = req.url?.split('?')[0] || ''
    const pathParts = urlPath.split('/').filter(p => p)
    const route = pathParts[pathParts.length - 1] || 'oauth'

    // Handle callback
    if (route === 'callback') {
      return handleCallback(req, res, clientId, clientSecret)
    }

    // Handle OAuth start
    return handleOAuthStart(req, res, clientId)
  } catch (error: any) {
    console.error('Error in Discord OAuth handler:', error)
    return res.status(500).json({
      error: 'OAuth flow failed',
      message: error.message,
    })
  }
}

/**
 * Start OAuth flow - redirect to Discord
 */
function handleOAuthStart(
  req: VercelRequest,
  res: VercelResponse,
  clientId: string
) {
  // Get redirect URI
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'thelostandunfounds.com'
  const redirectUri = `${protocol}://${host}/api/discord/oauth/callback`

  // Get state (optional - for CSRF protection)
  const state = req.query.state as string | undefined

  // Get scopes (default: identify, email)
  const scopes = (req.query.scopes as string | undefined)?.split(',') || ['identify', 'email']

  // Generate OAuth URL
  const oauthUrl = getDiscordOAuthUrl(clientId, redirectUri, scopes, state)

  // Redirect to Discord
  return res.redirect(302, oauthUrl)
}

/**
 * Handle OAuth callback - exchange code for token
 */
async function handleCallback(
  req: VercelRequest,
  res: VercelResponse,
  clientId: string,
  clientSecret: string
) {
  const code = req.query.code as string
  const state = req.query.state as string | undefined
  const error = req.query.error as string | undefined

  // Handle OAuth error
  if (error) {
    return res.status(400).json({
      error: 'Discord OAuth error',
      message: error,
    })
  }

  // Validate code
  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code',
      message: 'Discord did not provide an authorization code',
    })
  }

  try {
    // Get redirect URI
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'thelostandunfounds.com'
    const redirectUri = `${protocol}://${host}/api/discord/oauth/callback`

    // Exchange code for access token
    const tokenData = await exchangeDiscordCode(code, clientId, clientSecret, redirectUri)

    // Get user info
    const user = await getDiscordUser(tokenData.access_token)

    // TODO: Store user session/token in your database
    // TODO: Create or update user account
    // TODO: Set session cookie or return JWT

    // For now, return user info (in production, redirect to your app with session)
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        email: user.email,
        verified: user.verified,
      },
      // In production, don't return tokens to client
      // Store them server-side and use session cookies
      token: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
      },
      // TODO: Redirect to your app's success page
      // return res.redirect(302, '/auth/success?discord=true')
    })
  } catch (error: any) {
    console.error('Error exchanging Discord code:', error)
    return res.status(500).json({
      error: 'Failed to complete OAuth flow',
      message: error.message,
    })
  }
}
