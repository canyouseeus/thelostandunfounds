import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({
        error: 'Database service not configured'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if email exists in database (case-insensitive search)
    const normalizedEmail = email.toLowerCase().trim()
    const { data: subscribers, error: queryError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .ilike('email', normalizedEmail)

    if (queryError || !subscribers || subscribers.length === 0) {
      // Try exact match as fallback
      const { data: exactMatch } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('email', normalizedEmail)
        .limit(1)
      
      if (!exactMatch || exactMatch.length === 0) {
        return res.status(404).json({
          error: `Email "${normalizedEmail}" not found in subscribers list`
        })
      }
    }

    const targetEmail = subscribers?.[0]?.email || normalizedEmail

    // Send welcome email via Zoho Mail
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
      return res.status(500).json({
        error: 'Email service not configured'
      })
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
      console.error('Zoho token refresh error:', errorText)
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

    // Fallback: extract account ID from email
    if (!accountId) {
      const emailParts = fromEmail.split('@')
      accountId = emailParts[0]
    }

    if (!accountId) {
      return res.status(500).json({
        error: 'Failed to get email account ID'
      })
    }

    // Send welcome email
    const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`

    const welcomeEmailResponse = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: targetEmail,
        subject: 'Welcome to THE LOST+UNFOUNDS',
        content: `
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
                        <div style="color: #000000 !important; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">THE LOST+UNFOUNDS</div>
                      </td>
                    </tr>
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
                        <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: center; letter-spacing: 0.1em; background-color: #000000 !important;">
                          CAN YOU SEE US?
                        </h1>
                        <h2 style="color: #ffffff !important; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center; background-color: #000000 !important;">
                          Thanks for subscribing!
                        </h2>
                        <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center; background-color: #000000 !important;">
                          We're excited to have you join THE LOST+UNFOUNDS community.
                        </p>
                        <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0; text-align: center; background-color: #000000 !important;">
                          You'll receive updates about:
                        </p>
                        <ul style="color: #ffffff !important; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 0; list-style: none; text-align: center; background-color: #000000 !important;">
                          <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">New tools and features</li>
                          <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">Platform updates</li>
                          <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">Special announcements</li>
                        </ul>
                        <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center; background-color: #000000 !important;">
                          Stay tuned for what's coming next!
                        </p>
                        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0; background-color: #000000 !important;">
                        <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: center; background-color: #000000 !important;">
                          If you didn't sign up for this newsletter, you can safely ignore this email.
                        </p>
                        <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center; background-color: #000000 !important;">
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

    if (!welcomeEmailResponse.ok) {
      const errorText = await welcomeEmailResponse.text()
      console.error('Zoho welcome email error:', errorText)
      return res.status(500).json({
        error: 'Failed to send email'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully'
    })

  } catch (error: any) {
    console.error('Resend welcome email error:', error)
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred'
    })
  }
}

