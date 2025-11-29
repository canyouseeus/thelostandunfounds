import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { toEmail } = req.body

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ error: 'Valid toEmail is required' })
  }

  try {
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Get Zoho access token
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
    const accessToken = tokenData.access_token

    // Get account ID
    const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    })

    let accountId: string | null = null
    let actualFromEmail: string = fromEmail
    
    if (accountInfoResponse.ok) {
      const accounts = await accountInfoResponse.json()
      if (accounts.data && accounts.data.length > 0) {
        const account = accounts.data[0]
        accountId = account.accountId || account.account_id
        actualFromEmail = account.emailAddress || account.email || account.accountName || fromEmail
      }
    }

    if (!accountId) {
      const emailParts = fromEmail.split('@')
      accountId = emailParts[0]
    }

    console.log('Sending test email:', {
      from: actualFromEmail,
      to: toEmail,
      accountId,
      configuredEmail: fromEmail
    })

    // Send test email
    const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`
    
    const emailResponse = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: actualFromEmail,
        toAddress: toEmail,
        subject: 'Test Email from THE LOST+UNFOUNDS',
        content: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif; }
              table { background-color: #000000 !important; }
              td { background-color: #000000 !important; }
            </style>
          </head>
          <body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important;">
            <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
              <tr>
                <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
                  <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 auto !important;">
                    <tr>
                      <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                        <div style="color: #ffffff !important; font-size: 24px; font-weight: bold;">THE LOST+UNFOUNDS</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                        <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: left; letter-spacing: 0.1em;">
                          CAN YOU SEE US?
                        </h1>
                        <h2 style="color: #ffffff !important; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: left;">
                          Test Email
                        </h2>
                        <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
                          This is a test email to verify the newsletter system is working correctly.
                        </p>
                        <p style="color: #ffffff !important; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; color: rgba(255, 255, 255, 0.7);">
                          <strong>From Email:</strong> ${actualFromEmail}<br>
                          <strong>Account ID:</strong> ${accountId}<br>
                          <strong>Sent At:</strong> ${new Date().toISOString()}
                        </p>
                        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
                        <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: left;">
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
        `,
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
      return res.status(500).json({ 
        error: errorMessage,
        details: {
          fromEmail: actualFromEmail,
          toEmail,
          accountId
        }
      })
    }

    return res.status(200).json({ 
      success: true, 
      message: `Test email sent successfully to ${toEmail}`,
      details: {
        fromEmail: actualFromEmail,
        toEmail,
        accountId,
        configuredEmail: fromEmail
      }
    })

  } catch (error: any) {
    console.error('Test email error:', error)
    return res.status(500).json({ 
      error: error.message || 'An error occurred while sending the test email' 
    })
  }
}
