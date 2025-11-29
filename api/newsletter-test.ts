import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Get Zoho access token
 */
async function getZohoAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho credentials not configured')
  }

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
    const errorText = await tokenResponse.text()
    throw new Error(`Failed to refresh Zoho token: ${tokenResponse.status} ${errorText}`)
  }

  const tokenData: ZohoTokenResponse = await tokenResponse.json()
  return tokenData.access_token
}

/**
 * Get Zoho account ID and email
 */
async function getZohoAccountInfo(accessToken: string, fallbackEmail: string): Promise<{ accountId: string; email: string }> {
  const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
    method: 'GET',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
    },
  })

  if (accountInfoResponse.ok) {
    const accounts = await accountInfoResponse.json()
    if (accounts.data && accounts.data.length > 0) {
      const account = accounts.data[0]
      const accountId = account.accountId || account.account_id
      // Try to get the actual email from the account response
      const accountEmail = account.emailAddress || account.email || account.accountName || fallbackEmail
      
      if (accountId) {
        return { accountId, email: accountEmail }
      }
    }
  }

  // Fallback: extract account ID from email
  const emailParts = fallbackEmail.split('@')
  return { accountId: emailParts[0], email: fallbackEmail }
}

/**
 * Send test email via Zoho Mail API
 */
async function sendTestEmail(
  accessToken: string,
  accountId: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`

  const emailResponse = await fetch(mailApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fromAddress: fromEmail,
      toAddress: toEmail,
      subject: subject,
      content: htmlContent,
      mailFormat: 'html',
    }),
  })

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text()
    let errorMessage = `Failed to send email: ${emailResponse.status}`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.data?.moreInfo) {
        errorMessage = `Zoho Error: ${errorJson.data.moreInfo}`
      } else if (errorJson.status?.description) {
        errorMessage = `Zoho Error: ${errorJson.status.description}`
      }
    } catch {
      errorMessage = `Failed to send email: ${emailResponse.status}. Details: ${errorText}`
    }
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { toEmail } = req.body

  // Validate input
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ error: 'Valid toEmail is required' })
  }

  try {
    // Check Zoho configuration
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    if (!fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Get Zoho access token and account info
    const accessToken = await getZohoAccessToken()
    const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
    
    console.log('Zoho account info:', {
      accountId: accountInfo.accountId,
      configuredEmail: fromEmail,
      actualEmail: accountInfo.email,
      usingActualEmail: accountInfo.email !== fromEmail
    })

    // Send test email
    const testSubject = 'Test Email from THE LOST+UNFOUNDS Newsletter System'
    const testContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; }
          table { background-color: #000000 !important; }
          td { background-color: #000000 !important; }
        </style>
      </head>
      <body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
          <tr>
            <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
              <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 auto !important;">
                <!-- Logo -->
                <tr>
                  <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                    <div style="color: #ffffff !important; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">THE LOST+UNFOUNDS</div>
                  </td>
                </tr>
                <!-- Main Content -->
                <tr>
                  <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                    <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: left; letter-spacing: 0.1em; background-color: #000000 !important;">
                      CAN YOU SEE US?
                    </h1>
                    <h2 style="color: #ffffff !important; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">
                      Test Email
                    </h2>
                    <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">
                      This is a test email from the newsletter system.
                    </p>
                    <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">
                      <strong>From Email:</strong> ${accountInfo.email}<br>
                      <strong>Configured Email:</strong> ${fromEmail}<br>
                      <strong>Account ID:</strong> ${accountInfo.accountId}<br>
                      <strong>Sent At:</strong> ${new Date().toISOString()}
                    </p>
                    <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; background-color: #000000 !important;">
                      If you received this email, the newsletter system is working correctly!
                    </p>
                    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0; background-color: #000000 !important;">
                    <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: left; background-color: #000000 !important;">
                      © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
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

    const result = await sendTestEmail(
      accessToken,
      accountInfo.accountId,
      accountInfo.email,
      toEmail,
      testSubject,
      testContent
    )

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to send test email',
        accountInfo: {
          accountId: accountInfo.accountId,
          configuredEmail: fromEmail,
          actualEmail: accountInfo.email,
        }
      })
    }

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${toEmail}`,
      accountInfo: {
        accountId: accountInfo.accountId,
        configuredEmail: fromEmail,
        actualEmail: accountInfo.email,
        usingActualEmail: accountInfo.email !== fromEmail
      }
    })

  } catch (error: any) {
    console.error('Test email error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the test email',
    })
  }
}
