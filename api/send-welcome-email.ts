import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Send welcome email with brand styling
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  try {
    // Get Zoho credentials
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
      return res.status(500).json({ 
        error: 'Email service not configured' 
      })
    }

    // Get access token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      return res.status(500).json({ 
        error: 'Failed to authenticate with email service' 
      })
    }

    const tokenData: ZohoTokenResponse = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get account ID
    const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    })

    let accountId: string | null = null
    
    if (accountInfoResponse.ok) {
      const accounts = await accountInfoResponse.json()
      if (accounts.data && accounts.data.length > 0) {
        accountId = accounts.data[0].accountId || accounts.data[0].account_id
      }
    }

    if (!accountId) {
      const emailParts = fromEmail.split('@')
      accountId = emailParts[0]
    }

    // Get the site URL for logo
    const siteUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://thelostandunfounds.com')

    // Create branded welcome email HTML
    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to THE LOST+UNFOUNDS</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #000000; border: 1px solid rgba(255, 255, 255, 0.1);">
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding: 40px 20px 20px;">
              <img src="${siteUrl}/logo.png" alt="THE LOST+UNFOUNDS" style="max-width: 190px; height: auto; display: block;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
                CAN YOU SEE US?
              </h1>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Welcome to THE LOST+UNFOUNDS
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
                Thank you for subscribing! We're excited to have you join our community.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
                You'll be the first to know about:
              </p>
              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.8;">
                <li>New tools and features</li>
                <li>Product launches and updates</li>
                <li>Exclusive offers and announcements</li>
                <li>Behind-the-scenes content</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${siteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Visit Our Site
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: rgba(255, 255, 255, 0.6);">
                © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.4);">
                You're receiving this because you subscribed at thelostandunfounds.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send welcome email
    const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`
    const emailResponse = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: email,
        subject: 'Welcome to THE LOST+UNFOUNDS',
        content: emailHTML,
        mailFormat: 'html',
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Zoho mail error:', errorText)
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: errorText
      })
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Welcome email sent successfully' 
    })

  } catch (error) {
    console.error('Send welcome email error:', error)
    return res.status(500).json({ 
      error: 'An error occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
