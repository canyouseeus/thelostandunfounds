import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface PublishedPost {
  id: string
  title: string
  slug: string
  author_name: string | null
  subdomain: string | null
  published_at: string | null
}

interface Submission {
  id: string
  title: string
  author_email: string
  author_name: string
  subdomain: string | null
  publication_email_sent_at: string | null
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
async function countPublishedPosts(supabase: any, authorEmail: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('blog_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('author_email', authorEmail)
      .eq('status', 'published')

    if (error) {
      console.error('Error counting published posts:', error)
      return 1
    }

    return Math.max(1, count || 1)
  } catch (error) {
    console.error('Error counting published posts:', error)
    return 1
  }
}

/**
 * Send publication notification email
 */
async function sendPublicationEmail(
  postTitle: string,
  postUrl: string,
  authorName: string,
  authorEmail: string,
  postNumber: number,
  submissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'https://www.thelostandunfounds.com'
    
    const response = await fetch(`${baseUrl}/api/blog/post-published`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorEmail,
        authorName,
        postTitle,
        postUrl,
        submissionId, // Pass submission ID to mark email as sent
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: errorText }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all published blog posts
    const { data: publishedPosts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, author_name, subdomain, published_at')
      .eq('published', true)
      .eq('status', 'published')
      .order('published_at', { ascending: true })

    if (postsError) {
      throw new Error(`Failed to fetch published posts: ${postsError.message}`)
    }

    if (!publishedPosts || publishedPosts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No published posts found',
        stats: {
          totalPosts: 0,
          emailsSent: 0,
          emailsFailed: 0,
          alreadySent: 0,
        },
      })
    }

    // Get all published submissions
    const { data: publishedSubmissions, error: submissionsError } = await supabase
      .from('blog_submissions')
      .select('id, title, author_email, author_name, subdomain, publication_email_sent_at')
      .eq('status', 'published')

    if (submissionsError) {
      throw new Error(`Failed to fetch submissions: ${submissionsError.message}`)
    }

    // Match posts to submissions by title and author_name
    const postsToNotify: Array<{
      post: PublishedPost
      submission: Submission
      postUrl: string
    }> = []

    for (const post of publishedPosts) {
      // Find matching submission by title (case-insensitive) and author_name
      const matchingSubmission = publishedSubmissions?.find(
        (sub: Submission) =>
          sub.title.toLowerCase().trim() === post.title.toLowerCase().trim() &&
          sub.author_name === post.author_name &&
          !sub.publication_email_sent_at // Only include if email hasn't been sent
      )

      if (matchingSubmission && post.author_name) {
        // Build post URL
        const postUrl = post.subdomain
          ? `https://www.thelostandunfounds.com/blog/${post.subdomain}/${post.slug}`
          : `https://www.thelostandunfounds.com/thelostarchives/${post.slug}`

        postsToNotify.push({
          post,
          submission: matchingSubmission,
          postUrl,
        })
      }
    }

    // Send emails
    let emailsSent = 0
    let emailsFailed = 0
    const errors: string[] = []

    for (const { post, submission, postUrl } of postsToNotify) {
      try {
        // Count published posts for this author
        const postCount = await countPublishedPosts(supabase, submission.author_email)

        // Send email (handler will mark as sent if submissionId is provided)
        const result = await sendPublicationEmail(
          post.title,
          postUrl,
          submission.author_name,
          submission.author_email,
          postCount,
          submission.id
        )

        if (result.success) {
          emailsSent++
        } else {
          emailsFailed++
          errors.push(`${post.title} (${submission.author_email}): ${result.error || 'Unknown error'}`)
        }
      } catch (error: any) {
        emailsFailed++
        errors.push(`${post.title} (${submission.author_email}): ${error.message || 'Unknown error'}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const alreadySent = (publishedSubmissions?.length || 0) - postsToNotify.length

    return res.status(200).json({
      success: true,
      message: `Processed ${publishedPosts.length} published posts. Sent ${emailsSent} emails, ${emailsFailed} failed, ${alreadySent} already sent.`,
      stats: {
        totalPosts: publishedPosts.length,
        emailsSent,
        emailsFailed,
        alreadySent,
        pending: postsToNotify.length,
      },
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined, // Return first 20 errors
    })

  } catch (error: any) {
    console.error('Send existing publication emails error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending emails',
      success: false,
    })
  }
}
