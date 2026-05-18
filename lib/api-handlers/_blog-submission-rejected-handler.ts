import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTransactionalEmail } from './_resend-email-handler.js'

function generateEmailBody(articleTitle: string, authorName: string, rejectionReason: string, authorEmail?: string): string {
  // Escape HTML in rejection reason to prevent XSS
  const escapedReason = rejectionReason
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')

  return `
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Hello ${authorName},
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      Thank you for submitting your article to THE LOST ARCHIVES. After careful review, we're unable to publish your submission at this time.
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      <strong>${articleTitle}</strong>
    </p>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: left; font-family: Arial, sans-serif;">
      <strong>Reason for rejection:</strong>
    </p>
    <div style="background-color: rgba(255, 255, 255, 0.05); border-left: 3px solid rgba(255, 255, 255, 0.3); padding: 15px; margin: 0 0 20px 0;">
      <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0; text-align: left; font-family: Arial, sans-serif;">
        ${escapedReason}
      </p>
    </div>
    <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
      We encourage you to revise your submission based on the feedback above and resubmit. We appreciate your interest in contributing to THE LOST ARCHIVES.
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

  const { authorEmail, authorName, articleTitle, rejectionReason } = req.body

  if (!authorEmail || !authorName || !articleTitle || !rejectionReason) {
    return res.status(400).json({ error: 'authorEmail, authorName, articleTitle, and rejectionReason are required' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  try {
    const subject = `Article Submission Update: ${articleTitle}`
    const content = generateEmailBody(articleTitle, authorName, rejectionReason, authorEmail)

    const result = await sendTransactionalEmail({ to: authorEmail, subject, content })

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to send email',
        success: false
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Rejection notification email sent successfully'
    })

  } catch (error: any) {
    console.error('Rejection notification error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the rejection notification',
      success: false
    })
  }
}
