import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '../_supabase-admin-client'
import { getZohoAuthContext, sendZohoEmail } from '../_zoho-email-utils'

const isMissingTable = (error?: PostgrestError | null) =>
  Boolean(error?.message && error.message.toLowerCase().includes('does not exist'))

const toHtml = (text: string) => {
  const paragraphs = text
    .split('\n\n')
    .map(block => block.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return `<p style="margin:0 0 16px 0;">${text.trim()}</p>`
  }

  return paragraphs
    .map(paragraph => {
      const lines = paragraph
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
      const htmlLines =
        lines.length > 0
          ? lines
              .map(
                line =>
                  `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#ffffff;">${line}</p>`
              )
              .join('')
          : `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#ffffff;">${paragraph}</p>`
      return htmlLines
    })
    .join('')
}

const wrapInTemplate = (body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:32px;background-color:#000000;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;">
      ${body}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;" />
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">
        THE LOST+UNFOUNDS — Affiliate Program Update
      </p>
    </div>
  </body>
</html>`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subject, content, contentHtml, affiliateIds } = req.body ?? {}

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required' })
    }

    if (!content && !contentHtml) {
      return res.status(400).json({ error: 'Email content is required' })
    }

    if (!Array.isArray(affiliateIds) || affiliateIds.length === 0) {
      return res.status(400).json({ error: 'affiliateIds must include at least one id' })
    }

    const supabase = createServiceSupabaseClient()

    const affiliatesResult = await supabase
      .from('affiliates')
      .select('id, user_id, code, affiliate_code, status')
      .in('id', affiliateIds)

    if (affiliatesResult.error && !isMissingTable(affiliatesResult.error)) {
      throw affiliatesResult.error
    }

    const affiliates = affiliatesResult.data ?? []

    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'No affiliates found for provided ids' })
    }

    const recipientLookups = await Promise.all(
      affiliates.map(async record => {
        if (!record.user_id) {
          return { affiliateId: record.id, error: 'Missing user_id for affiliate' }
        }

        try {
          const { data, error } = await supabase.auth.admin.getUserById(record.user_id)
          if (error || !data?.user?.email) {
            return {
              affiliateId: record.id,
              error: error?.message || 'Email not found for affiliate user'
            }
          }

          return {
            affiliateId: record.id,
            email: data.user.email.toLowerCase(),
            code: record.code || record.affiliate_code || '',
            status: record.status || 'unknown'
          }
        } catch (lookupError: any) {
          return {
            affiliateId: record.id,
            error: lookupError?.message || 'Failed to fetch user email'
          }
        }
      })
    )

    const recipients = recipientLookups.filter(
      (item): item is { affiliateId: string; email: string; code: string; status: string } =>
        Boolean((item as any).email)
    )
    const lookupErrors = recipientLookups.filter(item => !('email' in item))

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No deliverable recipients were found',
        details: lookupErrors
      })
    }

    const htmlBody = wrapInTemplate(contentHtml || toHtml(content || ''))
    const zohoAuth = await getZohoAuthContext()

    const sendResults = []
    for (const recipient of recipients) {
      const result = await sendZohoEmail({
        auth: zohoAuth,
        to: recipient.email,
        subject,
        htmlContent: htmlBody
      })
      sendResults.push({
        affiliateId: recipient.affiliateId,
        email: recipient.email,
        success: result.success,
        error: result.error
      })
    }

    const sent = sendResults.filter(result => result.success).length
    const failed = sendResults.filter(result => !result.success)

    return res.status(200).json({
      sent,
      failed: failed.length,
      failures: failed,
      lookupErrors
    })
  } catch (error: any) {
    console.error('Send affiliate email handler error:', error)
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to send affiliate email campaign' })
  }
}
