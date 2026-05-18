import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTransactionalEmail } from './_resend-email-handler.js'

/**
 * Generate email inner body HTML for submission confirmation
 */
function generateEmailBody(articleTitle: string, authorName: string, authorEmail?: string): string {
  return `
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Hello ${authorName},
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Thank you for submitting your article to THE LOST ARCHIVES.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      <strong>${articleTitle}</strong>
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      We've received your submission and our team will review it shortly. You'll receive an email notification once your article has been reviewed.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: left; font-family: Arial, sans-serif;">
      We appreciate your contribution to THE LOST ARCHIVES community.
    </p>
    <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
    <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: left; font-family: Arial, sans-serif;">
      <a href="https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(authorEmail || '')}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe from emails</a>
    </p>
  `
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { authorEmail, authorName, articleTitle } = req.body

  if (!authorEmail || !authorName || !articleTitle) {
    return res.status(400).json({ error: 'authorEmail, authorName, and articleTitle are required' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  try {
    const subject = `Article Submitted: ${articleTitle}`
    const content = generateEmailBody(articleTitle, authorName, authorEmail)

    const result = await sendTransactionalEmail({ to: authorEmail, subject, content })

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to send email',
        success: false
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Confirmation email sent successfully'
    })

  } catch (error: any) {
    console.error('Submission confirmation error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the confirmation email',
      success: false
    })
  }
}
