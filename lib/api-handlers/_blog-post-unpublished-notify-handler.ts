import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js'

function generateEmailHtml(articleTitle: string, authorName: string, unpublishReason: string, authorEmail?: string): string {
    const currentYear = new Date().getFullYear()

    // Escape HTML in unpublish reason to prevent XSS
    const escapedReason = unpublishReason
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>')

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
              <div style="background-color: #000000; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px;">THE LOST+UNFOUNDS</h1>
              </div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 0; color: #ffffff;">
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
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left; font-family: Arial, sans-serif;">
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

    const { authorEmail, authorName, articleTitle, unpublishReason } = req.body

    if (!authorEmail || !authorName || !articleTitle || !unpublishReason) {
        return res.status(400).json({ error: 'authorEmail, authorName, articleTitle, and unpublishReason are required' })
    }

    try {
        const auth = await getZohoAuthContext()
        const subject = `Article Update: ${articleTitle} has been returned to review`
        const htmlContent = generateEmailHtml(articleTitle, authorName, unpublishReason, authorEmail)

        const result = await sendZohoEmail({
            auth,
            to: authorEmail,
            subject,
            htmlContent
        })

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
