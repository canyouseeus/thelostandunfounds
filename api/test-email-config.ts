import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Simple token check
  const expectedToken = process.env.RESET_TOKEN || 'reset-newsletter-2024'
  const providedToken = req.query.token || req.body?.token

  if (providedToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const config = {
    hasClientId: !!process.env.ZOHO_CLIENT_ID,
    hasClientSecret: !!process.env.ZOHO_CLIENT_SECRET,
    hasRefreshToken: !!process.env.ZOHO_REFRESH_TOKEN,
    hasFromEmail: !!(process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL),
    fromEmail: process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || 'NOT SET'
  }

  // Test token refresh
  let tokenTest: { success: boolean; error: string | null } = { success: false, error: null }
  if (config.hasClientId && config.hasClientSecret && config.hasRefreshToken) {
    try {
      const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
          client_id: process.env.ZOHO_CLIENT_ID!,
          client_secret: process.env.ZOHO_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        tokenTest = { success: true, error: null }
        
        // Test account ID retrieval
        const accountResponse = await fetch('https://mail.zoho.com/api/accounts', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
          },
        })

        if (accountResponse.ok) {
          const accounts = await accountResponse.json()
          return res.status(200).json({
            config,
            tokenTest: { success: true },
            accountInfo: {
              success: true,
              accounts: accounts.data || [],
              accountId: accounts.data?.[0]?.accountId || accounts.data?.[0]?.account_id || 'NOT FOUND'
            }
          })
        } else {
          const errorText = await accountResponse.text()
          return res.status(200).json({
            config,
            tokenTest: { success: true },
            accountInfo: {
              success: false,
              error: errorText,
              status: accountResponse.status
            }
          })
        }
      } else {
        const errorText = await tokenResponse.text()
        tokenTest = { success: false, error: errorText }
      }
    } catch (error: any) {
      tokenTest = { success: false, error: error.message }
    }
  }

  return res.status(200).json({
    config,
    tokenTest
  })
}
