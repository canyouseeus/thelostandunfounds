import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from './_resend-email-handler.js'

/**
 * Generate welcome email inner body HTML
 */
function generateWelcomeEmailBody(userName: string, gettingStartedUrl: string): string {
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
  `
}

/**
 * Generate newsletter confirmation email inner body HTML
 */
function generateNewsletterConfirmationBody(subscriberEmail?: string): string {
  return `
    <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: center; letter-spacing: 0.1em;">
      CAN YOU SEE US?
    </h1>
    <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
      Thanks for subscribing!
    </h2>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
      We're excited to have you join THE LOST+UNFOUNDS community.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
      You'll receive updates about:
    </p>
    <ul style="color: #ffffff; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 0; list-style: none; text-align: center;">
      <li style="margin: 10px 0;">New tools and features</li>
      <li style="margin: 10px 0;">Platform updates</li>
      <li style="margin: 10px 0;">Special announcements</li>
    </ul>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
      Stay tuned for what's coming next!
    </p>
    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
    <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
      If you didn't sign up for this newsletter, you can safely ignore this email.
    </p>
    <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
      <a href="https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriberEmail || '')}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe from this newsletter</a>
    </p>
  `
}

/**
 * Generate publication notification email inner body HTML
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

function generatePublicationEmailBody(postTitle: string, postUrl: string, authorName: string, postNumber: number): string {
  const ordinal = getOrdinalSuffix(postNumber)

  return `
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
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
      <tr>
        <td align="left">
          <a href="${postUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; border: 2px solid #ffffff;">
            View Your Published Post &rarr;
          </a>
        </td>
      </tr>
    </table>
  `
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
          const content = generateWelcomeEmailBody(userName, gettingStartedUrl)

          const result = await sendTransactionalEmail({ to: user.email, subject, content })

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
              const content = generatePublicationEmailBody(post.title, postUrl, matchingSubmission.author_name, postNumber)

              const result = await sendTransactionalEmail({
                to: matchingSubmission.author_email,
                subject,
                content,
              })

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
          const content = generateNewsletterConfirmationBody(subscriber.email)

          const result = await sendTransactionalEmail({ to: subscriber.email, subject, content })

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
