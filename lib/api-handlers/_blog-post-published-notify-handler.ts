import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return num + 'st'
  }
  if (j === 2 && k !== 12) {
    return num + 'nd'
  }
  if (j === 3 && k !== 13) {
    return num + 'rd'
  }
  return num + 'th'
}

/**
 * Count published posts for an author by email
 */
async function countPublishedPosts(authorEmail: string): Promise<number> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured, cannot count posts')
      return 1 // Default to 1st if we can't count
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Count published submissions for this author
    // Note: This query runs after the submission status is updated to 'published'
    const { count, error } = await supabase
      .from('blog_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('author_email', authorEmail)
      .eq('status', 'published')

    if (error) {
      console.error('Error counting published posts:', error)
      return 1 // Default to 1st if query fails
    }

    // Return the count, ensuring it's at least 1 (since this post is being published)
    // If count is 0 or null, this is their first post
    const postCount = count && count > 0 ? count : 1
    return postCount
  } catch (error) {
    console.error('Error counting published posts:', error)
    return 1 // Default to 1st if query fails
  }
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
      const accountId = account.accountId || account.account_id || account.accountId
      let accountEmail = fallbackEmail
      if (account.emailAddress && typeof account.emailAddress === 'string') {
        accountEmail = account.emailAddress
      } else if (account.email && typeof account.email === 'string') {
        accountEmail = account.email
      } else if (account.accountName && typeof account.accountName === 'string') {
        accountEmail = account.accountName
      }
      
      if (accountId) {
        return { accountId, email: accountEmail }
      }
    }
  }

  // Fallback: extract account ID from email
  const emailParts = fallbackEmail.split('@')
  const fallbackAccountId = emailParts[0]
  return { accountId: fallbackAccountId, email: fallbackEmail }
}

/**
 * Send email via Zoho Mail API
 */
async function sendZohoEmail(
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
    console.error('Zoho email API error:', {
      status: emailResponse.status,
      statusText: emailResponse.statusText,
      error: errorText,
    })
    return { success: false, error: `Failed to send email: ${emailResponse.status}` }
  }

  return { success: true }
}

/**
 * Generate email HTML for blog post publication notification
 */
function generateEmailHtml(postTitle: string, postUrl: string, authorName: string, postNumber: number): string {
  const currentYear = new Date().getFullYear()
  const ordinal = getOrdinalSuffix(postNumber)
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #000000;">
    <tr>
      <td align="left" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #000000;">
          <!-- Branding Header -->
          <tr>
            <td align="left" style="padding: 0 0 30px 0;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; text-align: left; letter-spacing: 0.05em; font-family: Arial, sans-serif;">
                THE LOST+UNFOUNDS
              </h1>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 0; color: #ffffff;">
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                Hello ${authorName},
              </p>
              <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif; font-weight: bold;">
                Congratulations! Your ${ordinal} blog post has been published to THE LOST ARCHIVES BOOK CLUB!
              </p>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                <strong>${postTitle}</strong>
              </p>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: left; font-family: Arial, sans-serif;">
                Your article is now live and available for readers to discover.
              </p>
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                <tr>
                  <td align="left">
                    <a href="${postUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff;">
                      View Your Published Post →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0; text-align: left; font-family: Arial, sans-serif;">
                © ${currentYear} THE LOST+UNFOUNDS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { authorEmail, authorName, postTitle, postUrl, submissionId } = req.body

  // Validate input
  if (!authorEmail || !authorName || !postTitle || !postUrl) {
    return res.status(400).json({ error: 'authorEmail, authorName, postTitle, and postUrl are required' })
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  try {
    // Check Zoho configuration
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    if (!fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Count published posts for this author
    const publishedCount = await countPublishedPosts(authorEmail)
    const postNumber = publishedCount // This is the count including the current one

    // Get Zoho access token and account info
    const accessToken = await getZohoAccessToken()
    const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
    const actualFromEmail = (accountInfo.email && typeof accountInfo.email === 'string' && accountInfo.email.includes('@')) 
      ? accountInfo.email 
      : fromEmail

    // Generate email content with post number
    const subject = `Congratulations! Your ${getOrdinalSuffix(postNumber)} Article Has Been Published: ${postTitle}`
    const htmlContent = generateEmailHtml(postTitle, postUrl, authorName, postNumber)

    // Send email
    const result = await sendZohoEmail(
      accessToken,
      accountInfo.accountId,
      actualFromEmail,
      authorEmail,
      subject,
      htmlContent
    )

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to send email',
        success: false
      })
    }

    // If submissionId is provided, mark email as sent
    if (submissionId) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          await supabase
            .from('blog_submissions')
            .update({ publication_email_sent_at: new Date().toISOString() })
            .eq('id', submissionId)
        }
      } catch (updateError) {
        console.error('Failed to update email sent timestamp:', updateError)
        // Don't fail the request if timestamp update fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Notification email sent successfully'
    })

  } catch (error: any) {
    console.error('Blog post notification error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the notification email',
      success: false
    })
  }
}
