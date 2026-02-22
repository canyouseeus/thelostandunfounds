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

  const { email, turnstileToken } = req.body

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  // Verify Turnstile token if provided (skip in development)
  // According to Cloudflare docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
  // Siteverify API requires application/x-www-form-urlencoded format, not JSON
  const isDev = process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production'
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY

  // Only verify Turnstile in production
  if (!isDev && turnstileSecret) {
    if (turnstileToken) {
      const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      })

      const verifyData = await verifyResponse.json()
      if (!verifyData.success) {
        console.error('Turnstile verification failed:', verifyData)
        return res.status(400).json({
          error: 'Security verification failed. Please try again.'
        })
      }
    } else {
      // If Turnstile is configured but no token provided in production, reject
      return res.status(400).json({
        error: 'Security verification required. Please refresh and try again.'
      })
    }
  }

  try {
    // Initialize Supabase client
    // Use service role key for server-side operations, fallback to anon key
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({
        error: 'Database service not configured'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Save email to Supabase
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        subscribed_at: new Date().toISOString(),
        source: 'landing_page',
        verified: true,
      })

    if (insertError) {
      // If email already exists, that's okay
      if (insertError.code === '23505') {
        return res.status(200).json({
          success: true,
          message: 'Email already subscribed!'
        })
      }
      throw insertError
    }

    // Send confirmation email via Zoho Mail
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

    // Diagnostic info
    const emailConfig = {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
      hasFromEmail: !!fromEmail
    }

    if (clientId && clientSecret && refreshToken && fromEmail) {
      try {
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
          console.error('Zoho token refresh failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            error: errorText
          })
          throw new Error(`Failed to refresh Zoho token: ${tokenResponse.status} ${tokenResponse.statusText}`)
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
        let accountInfo: any = null
        let actualFromEmail: string = fromEmail

        if (accountInfoResponse.ok) {
          const accounts = await accountInfoResponse.json()
          console.log('Zoho accounts response:', JSON.stringify(accounts, null, 2))
          if (accounts.data && accounts.data.length > 0) {
            accountInfo = accounts.data[0]
            accountId = accounts.data[0].accountId || accounts.data[0].account_id || accounts.data[0].accountId
            // Get the actual email from the account response
            actualFromEmail = accountInfo.emailAddress || accountInfo.email || accountInfo.accountName || fromEmail
          }
        } else {
          const accountErrorText = await accountInfoResponse.text()
          console.error('Failed to get Zoho accounts:', {
            status: accountInfoResponse.status,
            error: accountErrorText
          })
        }

        // Fallback: extract account ID from email (this might not work for all Zoho setups)
        if (!accountId) {
          console.warn('Account ID not found from API, using email prefix as fallback')
          const emailParts = fromEmail.split('@')
          accountId = emailParts[0]
        }

        console.log('Using account ID:', accountId, 'configured email:', fromEmail, 'actual email:', actualFromEmail)

        if (accountId) {
          // Send welcome/confirmation email to user
          const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`

          const emailResponse = await fetch(mailApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromAddress: actualFromEmail,
              toAddress: email,
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
                          <!-- Branding Header -->
                          <tr>
                            <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
                              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
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
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 20px 0 10px 0; text-align: center; background-color: #000000 !important;">
                © ${new Date().getFullYear()} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; background-color: #000000 !important;">
                <a href="https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: rgba(255, 255, 255, 0.6) !important; text-decoration: underline;">Unsubscribe from this newsletter</a>
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
            let errorDetails = errorText
            try {
              const errorJson = JSON.parse(errorText)
              errorDetails = JSON.stringify(errorJson, null, 2)
            } catch {
              // Keep as text if not JSON
            }
            console.error('Zoho email API error:', {
              status: emailResponse.status,
              statusText: emailResponse.statusText,
              error: errorText,
              email: email,
              accountId: accountId,
              fromEmail: fromEmail,
              mailApiUrl: mailApiUrl
            })
            // Parse Zoho error for better message
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
            throw new Error(errorMessage)
          }

          // Welcome email sent successfully — track it in the database
          try {
            await supabase
              .from('newsletter_subscribers')
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq('email', email.toLowerCase().trim())
            console.log(`Welcome email tracked for ${email}`)
          } catch (trackingError: any) {
            // Don't fail the subscription if tracking fails
            console.error('Failed to track welcome email:', trackingError.message)
          }
        } else {
          console.error('No account ID available for sending email')
          throw new Error('Failed to get email account ID')
        }
      } catch (emailError: any) {
        // Log error but don't fail the subscription
        console.error('Failed to send confirmation email:', {
          error: emailError.message,
          stack: emailError.stack,
          email: email
        })
        // Continue - subscription was saved successfully
        // Return warning in response with diagnostic info
        return res.status(200).json({
          success: true,
          message: 'Successfully subscribed! However, confirmation email failed to send.',
          warning: 'Email sending error: ' + (emailError.message || 'Unknown error'),
          emailSaved: true,
          emailConfig: emailConfig,
          errorDetails: emailError.message
        })
      }
    } else {
      console.warn('Zoho email credentials not configured - skipping email send')
      // Return diagnostic info when credentials are missing
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed! However, email sending is not configured.',
        warning: 'Zoho email credentials are missing. Check Vercel environment variables.',
        emailSaved: true,
        emailConfig: emailConfig,
        missingCredentials: {
          clientId: !clientId,
          clientSecret: !clientSecret,
          refreshToken: !refreshToken,
          fromEmail: !fromEmail
        }
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed! Check your email for confirmation.',
      emailConfig: emailConfig,
      emailSent: true
    })

  } catch (error: any) {
    console.error('Newsletter subscription error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred. Please try again later.'
    })
  }
}

