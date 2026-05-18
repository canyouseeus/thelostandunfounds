import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { sendTransactionalEmail } from './_resend-email-handler.js'

dotenv.config({ path: '.env.local' })

interface UserSubdomain {
  user_id: string
  subdomain: string
  welcome_email_sent_at: string | null
}

interface UserWithEmail {
  userId: string
  email: string
  subdomain: string
  source: string
}

/**
 * Generate welcome email inner body HTML
 */
function generateWelcomeEmailBody(userName: string, gettingStartedUrl: string, userEmail?: string): string {
  return `
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
      <li>Meeting Google's E&#8209;E&#8209;A&#8209;T standards</li>
      <li>Earning as an Amazon affiliate</li>
    </ul>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: left; font-family: Arial, sans-serif;">
      The guide is your go-to resource to make sure your contributions are impactful, authentic, and set up to succeed.
    </p>
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
      <tr>
        <td align="left">
          <a href="${gettingStartedUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff;">
            View Getting Started Guide &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      If you have any questions or need assistance, feel free to reach out. We're here to help you succeed!
    </p>
    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
    <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left; font-family: Arial, sans-serif;">
      <a href="https://www.thelostandunfounds.com/unsubscribe" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe from emails</a>
    </p>
  `
}

/**
 * Get user email from user_roles or user_subdomains
 */
async function getUserEmail(supabase: any, userId: string): Promise<string | null> {
  // Try to get email from user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle()

  if (roleData?.email) {
    return roleData.email
  }

  // Fallback: try to get from auth.users via RPC (if available)
  // For now, return null and we'll use a placeholder
  return null
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { testEmail, manualEmails } = req.body as {
    testEmail?: string
    manualEmails?: Array<{ subdomain: string; email: string }>
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    const supabaseKey = supabaseServiceKey || supabaseAnonKey

    // Diagnostic logging for debugging 403 errors
    console.log('[Welcome Emails] Using Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasSvcKey: !!supabaseServiceKey,
      svcKeyLength: supabaseServiceKey?.length,
      svcKeyPrefix: supabaseServiceKey?.substring(0, 10),
      usingServiceKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Welcome Emails] Missing Supabase configuration');
      return res.status(500).json({ error: 'Database service not configured' })
    }

    // Use service role key for admin operations (auth.admin) if available
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test mode: send to specific email
    if (testEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      const userName = testEmail.split('@')[0] || 'Contributor'
      const gettingStartedUrl = 'https://www.thelostandunfounds.com/blog/getting-started'
      const subject = 'Welcome to THE LOST ARCHIVES BOOK CLUB'
      const content = generateWelcomeEmailBody(userName, gettingStartedUrl, testEmail)

      const result = await sendTransactionalEmail({ to: testEmail, subject, content })

      console.log(`[Email] Test email attempt to ${testEmail}:`, result)

      if (result.success) {
        console.log(`[Email] SUCCESS: Test email sent to ${testEmail}`)
      } else {
        console.error(`[Email] FAILED: Test email to ${testEmail} failed:`, result.error)
      }

      if (!result.success) {
        return res.status(500).json({
          error: result.error || 'Failed to send test email',
          success: false
        })
      }

      return res.status(200).json({
        success: true,
        message: `Test welcome email sent successfully to ${testEmail}`,
        stats: {
          totalUsers: 1,
          emailsSent: 1,
          emailsFailed: 0,
        },
      })
    }

    // Get all users with subdomains who haven't received welcome emails
    const { data: userSubdomains, error: subdomainsError } = await supabase
      .from('user_subdomains')
      .select('user_id, subdomain, welcome_email_sent_at')
      .is('welcome_email_sent_at', null)
      .order('created_at', { ascending: true })

    console.log(`Found ${userSubdomains?.length || 0} users with subdomains who need welcome emails`)
    if (userSubdomains && userSubdomains.length > 0) {
      console.log('Subdomains found:', userSubdomains.map(u => u.subdomain).filter(Boolean))
    }

    if (subdomainsError) {
      throw new Error(`Failed to fetch user subdomains: ${subdomainsError.message}`)
    }

    if (!userSubdomains || userSubdomains.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users found who need welcome emails',
        stats: {
          totalUsers: 0,
          emailsSent: 0,
          emailsFailed: 0,
        },
      })
    }

    // Get user emails from multiple sources: user_roles, blog_submissions, blog_posts
    const usersWithEmails: UserWithEmail[] = []
    const emailMap = new Map<string, { email: string; source: string }>() // userId -> { email, source }

    // First, try user_roles table
    for (const subdomain of userSubdomains) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('email')
        .eq('user_id', subdomain.user_id)
        .maybeSingle()

      if (roleData?.email) {
        emailMap.set(subdomain.user_id, { email: roleData.email, source: 'user_roles' })
      }
    }

    // Second: get emails from blog_submissions by matching subdomain (case-insensitive)
    // This is the PRIMARY source for emails when users don't have emails in auth.users
    // IMPORTANT: Get ALL submissions first, then match by subdomain
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('blog_submissions')
      .select('author_email, subdomain')
      .not('author_email', 'is', null)
      .not('subdomain', 'is', null)

    if (submissionsError) {
      console.error('Error fetching blog_submissions:', submissionsError)
    }

    console.log(`Found ${submissionsData?.length || 0} submissions with emails and subdomains`)

    if (submissionsData && submissionsData.length > 0) {
      // Create a map of subdomain (lowercase) -> email from submissions
      const submissionEmailMap = new Map<string, string>()
      for (const submission of submissionsData) {
        if (submission.subdomain && submission.author_email) {
          const normalizedSubdomain = submission.subdomain.toLowerCase().trim()
          // Store the first email we find for each subdomain
          if (!submissionEmailMap.has(normalizedSubdomain)) {
            submissionEmailMap.set(normalizedSubdomain, submission.author_email)
            console.log(`Mapped subdomain "${normalizedSubdomain}" to email "${submission.author_email}"`)
          }
        }
      }

      console.log(`Created email map for ${submissionEmailMap.size} unique subdomains`)

      // Match subdomains to get emails (case-insensitive)
      // This should work even if user_id doesn't have an email in auth.users
      for (const subdomain of userSubdomains) {
        if (!emailMap.has(subdomain.user_id) && subdomain.subdomain) {
          const normalizedSubdomain = subdomain.subdomain.toLowerCase().trim()
          console.log(`Looking for email for subdomain "${normalizedSubdomain}" (user_id: ${subdomain.user_id})`)
          if (submissionEmailMap.has(normalizedSubdomain)) {
            const foundEmail = submissionEmailMap.get(normalizedSubdomain)!
            emailMap.set(subdomain.user_id, {
              email: foundEmail,
              source: 'blog_submissions'
            })
            console.log(`✓ Found email ${foundEmail} for subdomain ${subdomain.subdomain} from blog_submissions`)
          } else {
            console.warn(`✗ No email found in submissionEmailMap for subdomain "${normalizedSubdomain}"`)
            console.warn(`  Available subdomains in map:`, Array.from(submissionEmailMap.keys()))
          }
        }
      }
    } else {
      console.warn('No submissions data found or submissions array is empty')
    }

    // Fourth: Apply manual email mappings if provided (for users we know the emails for)
    if (manualEmails && Array.isArray(manualEmails)) {
      for (const manual of manualEmails) {
        if (manual.subdomain && manual.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email)) {
          // Find the user with this subdomain
          const matchingUser = userSubdomains.find(
            u => u.subdomain && u.subdomain.toLowerCase().trim() === manual.subdomain.toLowerCase().trim()
          )
          if (matchingUser && !emailMap.has(matchingUser.user_id)) {
            emailMap.set(matchingUser.user_id, {
              email: manual.email,
              source: 'manual'
            })
          }
        }
      }
    }

    // Third: For users still without emails, try to query auth.users directly (using service role)
    const usersStillWithoutEmails = userSubdomains.filter(u => !emailMap.has(u.user_id))
    if (usersStillWithoutEmails.length > 0 && supabaseServiceKey) {
      // Try to get emails from auth.users table (requires service role key)
      for (const user of usersStillWithoutEmails) {
        try {
          // Use admin API to get user by ID (requires service role key)
          if (supabase.auth && supabase.auth.admin) {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.user_id)

            if (!authError && authUser?.user?.email) {
              emailMap.set(user.user_id, {
                email: authUser.user.email,
                source: 'auth.users'
              })
            } else if (authError) {
              console.warn(`Could not get email from auth.users for user ${user.user_id} (${user.subdomain}):`, authError.message)
            }
          }
        } catch (err: any) {
          // If admin API is not available, log for manual review
          console.warn(`Could not get email from auth.users for user ${user.user_id} (${user.subdomain}):`, err?.message || err)
        }
      }
    } else if (usersStillWithoutEmails.length > 0 && !supabaseServiceKey) {
      console.warn(`Service role key not available - cannot query auth.users for ${usersStillWithoutEmails.length} users without emails`)
    }

    // Third: try to get from blog_posts by matching subdomain and author_name
    const { data: blogPostsData } = await supabase
      .from('blog_posts')
      .select('author_name, subdomain')
      .not('subdomain', 'is', null)
      .not('author_name', 'is', null)

    // Note: blog_posts doesn't have email, but we can try to match author_name to submissions
    // This is a more complex matching that we'll skip for now

    // Build final list with emails - ensure we check blog_submissions for EVERY user
    console.log(`Building final email list. Email map has ${emailMap.size} entries`)
    for (const subdomain of userSubdomains) {
      const emailData = emailMap.get(subdomain.user_id)

      if (emailData) {
        usersWithEmails.push({
          userId: subdomain.user_id,
          email: emailData.email,
          subdomain: subdomain.subdomain,
          source: emailData.source,
        })
        console.log(`✓ Added user ${subdomain.user_id} (${subdomain.subdomain}) with email ${emailData.email} from ${emailData.source}`)
      } else if (subdomain.subdomain) {
        // CRITICAL: If email not found yet, do a direct lookup in blog_submissions
        // This is the most reliable way to find emails
        console.warn(`✗ No email found for user ${subdomain.user_id} with subdomain ${subdomain.subdomain}`)
        console.warn(`  - Doing direct lookup in blog_submissions for subdomain "${subdomain.subdomain}"...`)

        const { data: directLookup, error: directError } = await supabase
          .from('blog_submissions')
          .select('author_email, subdomain')
          .eq('subdomain', subdomain.subdomain)
          .not('author_email', 'is', null)
          .limit(1)
          .maybeSingle()

        if (directError) {
          console.error(`  - Error in direct lookup:`, directError)
        }

        if (directLookup?.author_email) {
          console.warn(`  ✓ FOUND email ${directLookup.author_email} via direct lookup for subdomain ${subdomain.subdomain}`)
          usersWithEmails.push({
            userId: subdomain.user_id,
            email: directLookup.author_email,
            subdomain: subdomain.subdomain,
            source: 'blog_submissions_direct',
          })
        } else {
          // Try case-insensitive match as last resort
          if (submissionsData && submissionsData.length > 0) {
            const normalizedSubdomain = subdomain.subdomain.toLowerCase().trim()
            const matchingSubmission = submissionsData.find(
              s => s.subdomain && s.subdomain.toLowerCase().trim() === normalizedSubdomain
            )

            if (matchingSubmission?.author_email) {
              console.warn(`  ✓ FOUND email ${matchingSubmission.author_email} via case-insensitive match for subdomain ${subdomain.subdomain}`)
              usersWithEmails.push({
                userId: subdomain.user_id,
                email: matchingSubmission.author_email,
                subdomain: subdomain.subdomain,
                source: 'blog_submissions_case_insensitive',
              })
            } else {
              console.error(`  ✗✗✗ NO EMAIL FOUND for subdomain "${subdomain.subdomain}" after all attempts`)
              console.error(`  - Available subdomains in submissions:`, submissionsData.map(s => s.subdomain).filter(Boolean).slice(0, 10))
            }
          } else {
            console.error(`  ✗✗✗ NO SUBMISSIONS DATA AVAILABLE for lookup`)
          }
        }
      }
    }

    console.log(`Final usersWithEmails count: ${usersWithEmails.length}`)
    if (usersWithEmails.length > 0) {
      console.log(`Users to send emails to:`, usersWithEmails.map(u => `${u.subdomain} -> ${u.email}`))
    }

    if (usersWithEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No users with email addresses found. Found ${userSubdomains.length} users with subdomains, but none have emails in user_roles or blog_submissions.`,
        stats: {
          totalUsers: userSubdomains.length,
          emailsSent: 0,
          emailsFailed: 0,
        },
        debug: {
          usersWithSubdomains: userSubdomains.length,
          usersWithEmailsFound: emailMap.size,
          subdomainsWithoutEmails: userSubdomains.map(u => u.subdomain).filter(Boolean),
        },
      })
    }

    // Send welcome emails
    let emailsSent = 0
    let emailsFailed = 0
    const errors: string[] = []
    const gettingStartedUrl = 'https://www.thelostandunfounds.com/blog/getting-started'

    for (const user of usersWithEmails) {
      try {
        // Get user name (use subdomain or email prefix as fallback)
        const userName = user.subdomain || user.email.split('@')[0] || 'Contributor'

        const subject = 'Welcome to THE LOST ARCHIVES BOOK CLUB'
        const content = generateWelcomeEmailBody(userName, gettingStartedUrl, user.email)

        // Send email
        const result = await sendTransactionalEmail({ to: user.email, subject, content })

        if (result.success) {
          // Mark email as sent
          const { error: updateError } = await supabase
            .from('user_subdomains')
            .update({ welcome_email_sent_at: new Date().toISOString() })
            .eq('user_id', user.userId)

          if (updateError) {
            console.error(`Failed to update welcome email timestamp for user ${user.userId}:`, updateError)
          }

          emailsSent++
        } else {
          emailsFailed++
          errors.push(`${user.email}: ${result.error || 'Unknown error'}`)
        }
      } catch (error: any) {
        emailsFailed++
        errors.push(`${user.email}: ${error.message || 'Unknown error'}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 750))
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${emailsSent} welcome emails. ${emailsFailed} failed.`,
      stats: {
        totalUsers: usersWithEmails.length,
        emailsSent,
        emailsFailed,
        usersProcessed: usersWithEmails.map(u => `${u.email} (${u.subdomain}, source: ${u.source})`),
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      debug: {
        totalUsersWithSubdomains: userSubdomains.length,
        usersWithEmailsFound: usersWithEmails.length,
        subdomainsProcessed: usersWithEmails.map(u => u.subdomain),
        subdomainsWithoutEmails: userSubdomains
          .filter(u => !usersWithEmails.find(e => e.userId === u.user_id))
          .map(u => u.subdomain)
          .filter(Boolean),
      },
    })

  } catch (error: any) {
    console.error('Send welcome emails error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending welcome emails',
      success: false,
    })
  }
}
