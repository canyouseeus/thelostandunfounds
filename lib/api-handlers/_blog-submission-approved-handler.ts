import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTransactionalEmail } from './_resend-email-handler.js'

function generateEmailBody(articleTitle: string, authorName: string, authorEmail?: string): string {
  return `
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Hello ${authorName},
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Great news! Your article has been approved for publication.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      <strong>${articleTitle}</strong>
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Your article is now in the approval queue and will be published soon. You'll receive another email notification once it's live on THE LOST ARCHIVES.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: left; font-family: Arial, sans-serif;">
      Thank you for your contribution!
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
    const subject = `Article Approved: ${articleTitle}`
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
      message: 'Approval notification email sent successfully'
    })

  } catch (error: any) {
    console.error('Approval notification error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the approval notification',
      success: false
    })
  }
}
