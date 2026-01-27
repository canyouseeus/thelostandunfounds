import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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
 * Generate welcome email HTML
 */
function generateWelcomeEmailHtml(userName: string, gettingStartedUrl: string, userEmail?: string): string {
  const currentYear = new Date().getFullYear()
  
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
              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 0; color: #ffffff;">
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                Hello ${userName},
              </p>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                Welcome to THE LOST ARCHIVES BOOK CLUB! We're excited to have you join our community of contributors.
              </p>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                To help you get started, we've created a comprehensive Contributor Getting Started Guide that walks you through:
              </p>
              <ul style="color: #ffffff; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px; text-align: left; font-family: Arial, sans-serif;">
                <li>Setting up your account and subdomain</li>
                <li>Writing high-quality articles</li>
                <li>Using AI responsibly with Human-In-The-Loop principles</li>
                <li>Meeting Google's E‑E‑A‑T standards</li>
                <li>Earning as an Amazon affiliate</li>
              </ul>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: left; font-family: Arial, sans-serif;">
                The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.
              </p>
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                <tr>
                  <td align="left">
                    <a href="${gettingStartedUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff;">
                      View Getting Started Guide →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
                If you have any questions or need assistance, feel free to reach out. We're here to help you succeed!
              </p>
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

/**
 * Generate newsletter confirmation email HTML
 */
function generateNewsletterConfirmationHtml(subscriberEmail?: string): string {
  const currentYear = new Date().getFullYear()
  
  return `<!DOCTYPE html>
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
                © ${currentYear} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; background-color: #000000 !important;">
                <a href="https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriberEmail || '')}" style="color: rgba(255, 255, 255, 0.6) !important; text-decoration: underline;">Unsubscribe from this newsletter</a>
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

/**
 * Generate publication notification email HTML
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

function generatePublicationEmailHtml(postTitle: string, postUrl: string, authorName: string, postNumber: number, authorEmail?: string): string {
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
              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const supabaseKey = supabaseServiceKey || supabaseAnonKey

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check Zoho configuration
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    if (!fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Get Zoho access token and account info
    const accessToken = await getZohoAccessToken()
    const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
    const actualFromEmail = (accountInfo.email && typeof accountInfo.email === 'string' && accountInfo.email.includes('@')) 
      ? accountInfo.email 
      : fromEmail

    const results = {
      welcomeEmails: { sent: 0, failed: 0, errors: [] as string[] },
      publicationEmails: { sent: 0, failed: 0, errors: [] as string[] },
      newsletterEmails: { sent: 0, failed: 0, errors: [] as string[] },
    }

    // 1. Send welcome emails to users who haven't received them
    console.log('Checking for users missing welcome emails...')
    const { data: userSubdomains, error: subdomainsError } = await supabase
      .from('user_subdomains')
      .select('user_id, subdomain, welcome_email_sent_at')
      .is('welcome_email_sent_at', null)
      .order('created_at', { ascending: true })

    if (subdomainsError) {
      console.error('Error fetching user subdomains:', subdomainsError)
    } else if (userSubdomains && userSubdomains.length > 0) {
      console.log(`Found ${userSubdomains.length} users missing welcome emails`)

      // Get emails for these users
      const usersWithEmails: Array<{ userId: string; email: string; subdomain: string }> = []
      
      for (const subdomain of userSubdomains) {
        // Try to get email from user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('email')
          .eq('user_id', subdomain.user_id)
          .maybeSingle()

        if (roleData?.email) {
          usersWithEmails.push({
            userId: subdomain.user_id,
            email: roleData.email,
            subdomain: subdomain.subdomain,
          })
        } else {
          // Try to get from blog_submissions
          const { data: submissionData } = await supabase
            .from('blog_submissions')
            .select('author_email')
            .eq('subdomain', subdomain.subdomain)
            .not('author_email', 'is', null)
            .limit(1)
            .maybeSingle()

          if (submissionData?.author_email) {
            usersWithEmails.push({
              userId: subdomain.user_id,
              email: submissionData.author_email,
              subdomain: subdomain.subdomain,
            })
          }
        }
      }

      // Send welcome emails
      for (const user of usersWithEmails) {
        try {
          const userName = user.subdomain || user.email.split('@')[0] || 'Contributor'
          const gettingStartedUrl = 'https://www.thelostandunfounds.com/blog/getting-started'
          const subject = 'Welcome to THE LOST ARCHIVES BOOK CLUB'
          const htmlContent = generateWelcomeEmailHtml(userName, gettingStartedUrl, user.email)

          const result = await sendZohoEmail(
            accessToken,
            accountInfo.accountId,
            actualFromEmail,
            user.email,
            subject,
            htmlContent
          )

          if (result.success) {
            // Mark email as sent
            await supabase
              .from('user_subdomains')
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq('user_id', user.userId)

            results.welcomeEmails.sent++
          } else {
            results.welcomeEmails.failed++
            results.welcomeEmails.errors.push(`${user.email}: ${result.error || 'Unknown error'}`)
          }
        } catch (error: any) {
          results.welcomeEmails.failed++
          results.welcomeEmails.errors.push(`${user.email}: ${error.message || 'Unknown error'}`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 2. Send publication emails to authors who haven't received them
    console.log('Checking for authors missing publication emails...')
    const { data: publishedPosts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, author_name, subdomain, published_at')
      .eq('published', true)
      .eq('status', 'published')
      .order('published_at', { ascending: true })

    if (postsError) {
      console.error('Error fetching published posts:', postsError)
    } else if (publishedPosts && publishedPosts.length > 0) {
      const { data: publishedSubmissions, error: submissionsError } = await supabase
        .from('blog_submissions')
        .select('id, title, author_email, author_name, subdomain, publication_email_sent_at')
        .eq('status', 'published')

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError)
      } else if (publishedSubmissions) {
        // Match posts to submissions
        for (const post of publishedPosts) {
          const matchingSubmission = publishedSubmissions.find(
            (sub: any) =>
              sub.title.toLowerCase().trim() === post.title.toLowerCase().trim() &&
              sub.author_name === post.author_name &&
              !sub.publication_email_sent_at
          )

          if (matchingSubmission && post.author_name && matchingSubmission.author_email) {
            try {
              // Count published posts for this author
              const { count } = await supabase
                .from('blog_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('author_email', matchingSubmission.author_email)
                .eq('status', 'published')

              const postNumber = Math.max(1, count || 1)
              const postUrl = post.subdomain
                ? `https://www.thelostandunfounds.com/blog/${post.subdomain}/${post.slug}`
                : `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`

              const subject = `Congratulations! Your ${getOrdinalSuffix(postNumber)} Article Has Been Published: ${post.title}`
              const htmlContent = generatePublicationEmailHtml(post.title, postUrl, matchingSubmission.author_name, postNumber, matchingSubmission.author_email)

              const result = await sendZohoEmail(
                accessToken,
                accountInfo.accountId,
                actualFromEmail,
                matchingSubmission.author_email,
                subject,
                htmlContent
              )

              if (result.success) {
                // Mark email as sent
                await supabase
                  .from('blog_submissions')
                  .update({ publication_email_sent_at: new Date().toISOString() })
                  .eq('id', matchingSubmission.id)

                results.publicationEmails.sent++
              } else {
                results.publicationEmails.failed++
                results.publicationEmails.errors.push(`${matchingSubmission.author_email}: ${result.error || 'Unknown error'}`)
              }
            } catch (error: any) {
              results.publicationEmails.failed++
              results.publicationEmails.errors.push(`${matchingSubmission.author_email}: ${error.message || 'Unknown error'}`)
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
    }

    // 3. Send newsletter confirmation emails to all verified subscribers
    // Note: Since there's no tracking field, we'll send to all verified subscribers
    // This ensures everyone gets the confirmation email with the header image
    console.log('Sending newsletter confirmation emails to all verified subscribers...')
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('verified', true)

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError)
    } else if (subscribers && subscribers.length > 0) {
      console.log(`Found ${subscribers.length} verified subscribers`)

      for (const subscriber of subscribers) {
        try {
          const subject = 'Welcome to THE LOST+UNFOUNDS'
          const htmlContent = generateNewsletterConfirmationHtml(subscriber.email)

          const result = await sendZohoEmail(
            accessToken,
            accountInfo.accountId,
            actualFromEmail,
            subscriber.email,
            subject,
            htmlContent
          )

          if (result.success) {
            results.newsletterEmails.sent++
          } else {
            results.newsletterEmails.failed++
            results.newsletterEmails.errors.push(`${subscriber.email}: ${result.error || 'Unknown error'}`)
          }
        } catch (error: any) {
          results.newsletterEmails.failed++
          results.newsletterEmails.errors.push(`${subscriber.email}: ${error.message || 'Unknown error'}`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return res.status(200).json({
      success: true,
      message: 'All missing emails processed',
      results: {
        welcomeEmails: {
          ...results.welcomeEmails,
          message: `Sent ${results.welcomeEmails.sent} welcome emails. ${results.welcomeEmails.failed} failed.`,
        },
        publicationEmails: {
          ...results.publicationEmails,
          message: `Sent ${results.publicationEmails.sent} publication emails. ${results.publicationEmails.failed} failed.`,
        },
        newsletterEmails: {
          ...results.newsletterEmails,
          message: `Sent ${results.newsletterEmails.sent} newsletter confirmation emails. ${results.newsletterEmails.failed} failed.`,
        },
      },
    })

  } catch (error: any) {
    console.error('Send all missing emails error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending emails',
      success: false,
    })
  }
}
