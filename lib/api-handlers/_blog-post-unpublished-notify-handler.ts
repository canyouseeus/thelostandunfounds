import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTransactionalEmail } from './_resend-email-handler.js'

function generateEmailBody(articleTitle: string, authorName: string, unpublishReason: string): string {
    // Escape HTML in unpublish reason to prevent XSS
    const escapedReason = unpublishReason
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
        We are writing to inform you that your article has been unpublished and returned to the review cycle for further revisions.
      </p>
      <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
        <strong>Article: ${articleTitle}</strong>
      </p>
      <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: left; font-family: Arial, sans-serif;">
        <strong>Reason for unpublishing:</strong>
      </p>
      <div style="background-color: rgba(255, 255, 255, 0.05); border-left: 3px solid rgba(255, 255, 255, 0.3); padding: 15px; margin: 0 0 20px 0;">
        <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0; text-align: left; font-family: Arial, sans-serif;">
          ${escapedReason}
        </p>
      </div>
      <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left; font-family: Arial, sans-serif;">
        Your submission is once again "Pending Review". Please log in to your dashboard to address the feedback above and resubmit for publication.
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

    const { authorEmail, authorName, articleTitle, unpublishReason } = req.body

    if (!authorEmail || !authorName || !articleTitle || !unpublishReason) {
        return res.status(400).json({ error: 'authorEmail, authorName, articleTitle, and unpublishReason are required' })
    }

    try {
        const subject = `Article Update: ${articleTitle} has been returned to review`
        const content = generateEmailBody(articleTitle, authorName, unpublishReason)

        const result = await sendTransactionalEmail({ to: authorEmail, subject, content })

        if (!result.success) {
            return res.status(500).json({
                error: result.error || 'Failed to send email',
                success: false
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Unpublish notification email sent successfully'
        })

    } catch (error: any) {
        console.error('Unpublish notification error:', error)
        return res.status(500).json({
            error: error.message || 'An error occurred while sending the unpublish notification',
            success: false
        })
    }
}
