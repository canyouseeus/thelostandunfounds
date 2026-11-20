import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { generateNewsletterEmail } from '../email-template.js'
import { createNewsletterSender } from './_newsletter-delivery.js'

function extractBodyContent(contentHtml: string): string {
  if (!contentHtml) {
    return ''
  }

  const bodyMatch = contentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim()
  }

  // If legacy templates wrapped content in a table, capture the first table block
  const tableMatch = contentHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i)
  if (tableMatch && tableMatch[0]) {
    return tableMatch[0].trim()
  }

  return contentHtml.trim()
}

// The bespoke newsletter shell that used to live here was DEAD CODE: defined,
// never called. The send path builds every message with generateNewsletterEmail
// from lib/email-template.ts, the same shared template every other email uses.
//
// It cost an afternoon on 2026-08-13. A fix was made to it, verified against it,
// and shipped, and none of it reached a single email. Deleted so nobody edits it
// again believing it renders the newsletter.

// Stop sending with this much of the function's 300s limit left, so the logs
// and the campaign record are always written before Vercel cuts the call.
const TIME_BUDGET_MS = 250_000

type SendLog = {
  subscriber_email: string
  status: 'sent' | 'failed' | 'pending'
  error_message: string | null
  sent_at: string | null
  provider: 'resend' | 'zoho' | null
}

function isMissingProviderColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  return /provider/i.test(error.message || '') && /(column|schema cache)/i.test(error.message || '')
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startedAt = Date.now()

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subject, content, contentHtml, campaignId, testEmail, scheduledFor, recipients } = req.body

  // Validate input
  if (!subject || !content || !contentHtml) {
    return res.status(400).json({ error: 'Subject, content, and contentHtml are required' })
  }

  const normalizedContentHtml = extractBodyContent(contentHtml)

  // If testEmail is provided, validate it
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return res.status(400).json({ error: 'Invalid testEmail format' })
  }

  // Validate scheduledFor if provided
  let scheduledDate: Date | null = null
  if (scheduledFor) {
    scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledFor date format' })
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' })
    }
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get subscriber count for campaign record
    const { count: subscriberCount, error: countError } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)

    if (countError) {
      throw countError
    }

    const totalSubscribers = testEmail ? 1 : (subscriberCount || 0)

    // If scheduling, create campaign and return early
    if (scheduledDate && !testEmail) {
      const campaignData: any = {
        subject,
        content,
        content_html: normalizedContentHtml,
        status: 'scheduled',
        scheduled_for: scheduledDate.toISOString(),
        total_subscribers: totalSubscribers,
      }

      let campaignRecord
      if (campaignId) {
        const { data, error } = await supabase
          .from('newsletter_campaigns')
          .update(campaignData)
          .eq('id', campaignId)
          .select()
          .single()
        if (error) throw error
        campaignRecord = data
      } else {
        const { data, error } = await supabase
          .from('newsletter_campaigns')
          .insert(campaignData)
          .select()
          .single()
        if (error) throw error
        campaignRecord = data
      }

      return res.status(200).json({
        success: true,
        message: `Newsletter scheduled for ${scheduledDate.toISOString()}`,
        campaignId: campaignRecord.id,
        scheduled: true,
        scheduledFor: scheduledDate.toISOString(),
        stats: {
          totalSubscribers,
          emailsSent: 0,
          emailsFailed: 0,
        },
      })
    }

    // Resume: a campaign that was held part-way through (both providers out of
    // room, or the call ran out of time) has 'pending' logs. Pick up exactly
    // those recipients, whoever the campaign was first sent to. The hourly
    // scheduled-newsletter cron calls this with the campaignId.
    let resumeEmails: Set<string> | null = null
    if (campaignId && !testEmail) {
      const { data: pendingLogs, error: pendingError } = await supabase
        .from('newsletter_send_logs')
        .select('subscriber_email')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
      if (pendingError) throw pendingError

      if (pendingLogs && pendingLogs.length > 0) {
        const { data: sentLogs } = await supabase
          .from('newsletter_send_logs')
          .select('subscriber_email')
          .eq('campaign_id', campaignId)
          .eq('status', 'sent')
        const alreadySent = new Set((sentLogs || []).map(l => l.subscriber_email))
        resumeEmails = new Set(
          pendingLogs.map(l => l.subscriber_email).filter(e => !alreadySent.has(e))
        )
        // Pending rows for people who did get it are stale; clear them.
        const stale = pendingLogs.map(l => l.subscriber_email).filter(e => alreadySent.has(e))
        if (stale.length > 0) {
          await supabase
            .from('newsletter_send_logs')
            .delete()
            .eq('campaign_id', campaignId)
            .eq('status', 'pending')
            .in('subscriber_email', stale)
        }
      }
    }

    // Who to send to
    let subscribers: { email: string }[]

    if (testEmail) {
      // Test mode: only send to the specified email
      subscribers = [{ email: testEmail }]
    } else if (resumeEmails) {
      subscribers = Array.from(resumeEmails).map(email => ({ email }))
      console.log(`[newsletter] Resuming campaign ${campaignId}: ${subscribers.length} held recipients`)
    } else if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      // Target mode: send only to selected recipients
      subscribers = recipients.map((email: string) => ({ email }))
    } else {
      // Normal mode: get all verified subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('verified', true)

      if (subscribersError) {
        throw subscribersError
      }

      if (!subscribersData || subscribersData.length === 0) {
        return res.status(400).json({ error: 'No subscribers found' })
      }

      // Filter out subscribers who have already received this newsletter (same subject, sent in last 24h)
      // This allows resuming a campaign without double-sending
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: recentCampaigns } = await supabase
        .from('newsletter_campaigns')
        .select('id')
        .eq('subject', subject)
        .gt('created_at', oneDayAgo)

      const recentCampaignIds = recentCampaigns?.map(c => c.id) || []

      let alreadySentEmails: Set<string> = new Set()

      if (recentCampaignIds.length > 0) {
        const { data: sentLogs } = await supabase
          .from('newsletter_send_logs')
          .select('subscriber_email')
          .in('campaign_id', recentCampaignIds)
          .eq('status', 'sent')

        if (sentLogs) {
          sentLogs.forEach(log => alreadySentEmails.add(log.subscriber_email))
        }
      }

      subscribers = subscribersData.filter(sub => !alreadySentEmails.has(sub.email))

      console.log(`Found ${subscribersData.length} total subscribers. Skipping ${alreadySentEmails.size} already sent. Sending to ${subscribers.length} new recipients.`)

      if (subscribers.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'All subscribers have already received this newsletter.',
          campaignId: null,
          stats: {
            totalSubscribers: subscribersData.length,
            emailsSent: 0,
            emailsFailed: 0,
            skipped: alreadySentEmails.size
          }
        })
      }
    }

    const hasZoho = !!(process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL)
    if (!hasZoho && !process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: 'No email provider configured. Set RESEND_API_KEY (preferred for bulk) or ZOHO_FROM_EMAIL.'
      })
    }

    // Create or update campaign record
    let campaignRecord
    if (campaignId) {
      const update: Record<string, any> = {
        subject,
        content,
        content_html: normalizedContentHtml,
        status: 'sending',
        updated_at: new Date().toISOString(),
      }
      // A resumed campaign keeps the audience size it started with.
      if (!resumeEmails) update.total_subscribers = totalSubscribers
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .update(update)
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      campaignRecord = data
    } else {
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          subject,
          content,
          content_html: normalizedContentHtml,
          status: 'sending',
          total_subscribers: recipients && Array.isArray(recipients) && recipients.length > 0
            ? subscribers.length
            : totalSubscribers,
        })
        .select()
        .single()

      if (error) throw error
      campaignRecord = data
    }

    // Per-recipient HTML: use centralized email template
    const buildRecipientHtml = (rawHtml: string, email: string) => {
      const html = generateNewsletterEmail(rawHtml, email)

      // Open-tracking pixel, added per recipient so an open can be attributed.
      //
      // It goes immediately before </body> rather than in the middle of the
      // content: a client that stops rendering early still counts the open, and
      // a 1x1 at the very end cannot disturb the layout.
      //
      // The address is base64url encoded so it is not sitting in readable form
      // in proxy logs. That is obfuscation, not authentication; the endpoint
      // treats it purely as an attribution hint.
      const token = Buffer.from(email, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const pixel =
        `<img src="https://www.thelostandunfounds.com/api/newsletter/open` +
        `?c=${encodeURIComponent(campaignRecord.id)}&e=${token}"` +
        ` width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`

      return html.includes('</body>')
        ? html.replace('</body>', `${pixel}</body>`)
        : html + pixel
    }

    // Resend first, Zoho when Resend is out of room or refuses, held when
    // neither has room. See _newsletter-delivery.ts.
    const sender = await createNewsletterSender(supabase, { allowZoho: hasZoho })

    let emailsSent = 0
    let emailsFailed = 0
    let emailsHeld = 0
    let heldForTime = false
    let holdReason = ''
    const errors: string[] = []

    // Send logs are flushed to the database DURING the loop, not after it.
    //
    // The resume paths skip anyone already logged 'sent'. If logs were only
    // written after the loop, a function timeout mid-send would leave real
    // emails delivered but nothing recorded, and the retry would send to the
    // whole list a second time. Flushing in chunks bounds the worst case to
    // FLUSH_EVERY un-recorded sends.
    const FLUSH_EVERY = 25
    let pendingLogs: SendLog[] = []
    let providerColumn = true

    const record = (log: SendLog) => {
      pendingLogs.push(log)
    }

    const insertLogs = async (rows: SendLog[]) => {
      const withCampaign = (r: SendLog) => {
        const row: Record<string, any> = { campaign_id: campaignRecord.id, ...r }
        if (!providerColumn) delete row.provider
        return row
      }
      let { error } = await supabase.from('newsletter_send_logs').insert(rows.map(withCampaign))
      if (error && providerColumn && isMissingProviderColumn(error)) {
        // Migration not applied yet: log without the provider.
        providerColumn = false
        ;({ error } = await supabase.from('newsletter_send_logs').insert(rows.map(withCampaign)))
      }
      return error
    }

    const flushLogs = async () => {
      if (pendingLogs.length === 0) return
      const batch = pendingLogs
      pendingLogs = []

      // A resumed recipient who is held again already has its pending row.
      const toInsert = batch.filter(l => !(l.status === 'pending' && resumeEmails?.has(l.subscriber_email)))
      const finished = batch
        .filter(l => l.status !== 'pending' && resumeEmails?.has(l.subscriber_email))
        .map(l => l.subscriber_email)

      try {
        const logError = toInsert.length > 0 ? await insertLogs(toInsert) : null
        if (logError) {
          console.error(
            `[newsletter] FAILED to persist ${toInsert.length} send logs for campaign ${campaignRecord.id}. ` +
            `Those recipients may be re-sent on retry. Error: ${logError.message}`
          )
          return
        }
        if (finished.length > 0) {
          await supabase
            .from('newsletter_send_logs')
            .delete()
            .eq('campaign_id', campaignRecord.id)
            .eq('status', 'pending')
            .in('subscriber_email', finished)
        }
      } catch (err: any) {
        console.error(
          `[newsletter] FAILED to persist ${batch.length} send logs for campaign ${campaignRecord.id}. ` +
          `Those recipients may be re-sent on retry. Error: ${err?.message}`
        )
      }
    }

    const hold = (email: string, reason: string) => {
      emailsHeld++
      record({
        subscriber_email: email,
        // A test send has nothing to resume; it simply didn't go.
        status: testEmail ? 'failed' : 'pending',
        error_message: reason,
        sent_at: null,
        provider: null,
      })
    }

    for (let i = 0; i < subscribers.length; i++) {
      const email = subscribers[i].email

      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        heldForTime = true
        holdReason = 'Held: the send ran out of time and resumes automatically'
        for (const rest of subscribers.slice(i)) hold(rest.email, holdReason)
        break
      }

      let outcome
      try {
        outcome = await sender.send(email, subject, buildRecipientHtml(contentHtml, email))
      } catch (error: any) {
        outcome = { status: 'failed' as const, error: error?.message || 'Unknown error' }
      }

      if (outcome.status === 'sent') {
        emailsSent++
        record({
          subscriber_email: email,
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          provider: outcome.provider,
        })
      } else if (outcome.status === 'failed') {
        emailsFailed++
        errors.push(`${email}: ${outcome.error}`)
        record({
          subscriber_email: email,
          status: 'failed',
          error_message: outcome.error,
          sent_at: new Date().toISOString(),
          provider: outcome.provider ?? null,
        })
      } else {
        // Neither provider has room: everyone left waits for the same reason.
        holdReason = outcome.reason
        for (const rest of subscribers.slice(i)) hold(rest.email, holdReason)
        break
      }

      if (pendingLogs.length >= FLUSH_EVERY) {
        await flushLogs()
      }
    }

    await flushLogs()

    // Totals come from the logs so a campaign sent over several calls adds up.
    const countLogs = async (status: string) => {
      const { count } = await supabase
        .from('newsletter_send_logs')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignRecord.id)
        .eq('status', status)
      return count ?? 0
    }
    const [totalSent, totalFailed, totalPending] = await Promise.all([
      countLogs('sent'),
      countLogs('failed'),
      countLogs('pending'),
    ])

    let resumeAt: Date | null = null
    if (totalPending > 0 && !testEmail) {
      resumeAt = heldForTime ? new Date(Date.now() + 60_000) : sender.resumeAt()
      if (!Number.isFinite(resumeAt.getTime())) resumeAt = null
    }

    const campaignUpdate: Record<string, any> = {
      emails_sent: totalSent,
      emails_failed: totalFailed,
      updated_at: new Date().toISOString(),
    }
    if (totalPending > 0 && !testEmail) {
      // The hourly scheduled-newsletter cron picks this up and resumes it.
      campaignUpdate.status = resumeAt ? 'scheduled' : 'sending'
      if (resumeAt) campaignUpdate.scheduled_for = resumeAt.toISOString()
    } else {
      campaignUpdate.status = totalSent === 0 && totalFailed > 0 ? 'failed' : 'sent'
      campaignUpdate.sent_at = new Date().toISOString()
    }
    await supabase
      .from('newsletter_campaigns')
      .update(campaignUpdate)
      .eq('id', campaignRecord.id)

    const parts = [`Sent ${emailsSent}`]
    if (sender.sentBy.zoho > 0) parts.push(`(${sender.sentBy.resend} by Resend, ${sender.sentBy.zoho} by Zoho)`)
    if (emailsFailed > 0) parts.push(`${emailsFailed} failed`)
    if (emailsHeld > 0 && !testEmail) {
      parts.push(
        resumeAt
          ? `${emailsHeld} waiting to send automatically after ${resumeAt.toISOString()}`
          : `${emailsHeld} waiting: ${holdReason}`
      )
    }

    return res.status(200).json({
      success: emailsSent > 0 || emailsHeld > 0 || emailsFailed === 0,
      message: parts.join(', '),
      campaignId: campaignRecord.id,
      stats: {
        totalSubscribers,
        emailsSent,
        emailsFailed,
        emailsHeld,
        sentByResend: sender.sentBy.resend,
        sentByZoho: sender.sentBy.zoho,
      },
      resumeAt: resumeAt ? resumeAt.toISOString() : undefined,
      holdReason: emailsHeld > 0 ? holdReason : undefined,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      warning: providerColumn ? undefined : 'Provider is not being logged yet (newsletter_send_logs.provider column is missing).',
    })

  } catch (error: any) {
    console.error('Newsletter send error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the newsletter',
    })
  }
}
