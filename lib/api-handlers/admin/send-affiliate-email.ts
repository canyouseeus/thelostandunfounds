import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '../_supabase-admin-client'
import { sendTransactionalEmail } from '../_resend-email-handler.js'

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

    // Inner body content — sendTransactionalEmail wraps it in the brand template
    const innerBody = contentHtml || toHtml(content || '')

    const sendResults = []
    for (const recipient of recipients) {
      const result = await sendTransactionalEmail({
        to: recipient.email,
        subject,
        content: innerBody,
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
