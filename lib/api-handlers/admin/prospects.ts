import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../_booking-payment-utils.js'
import { verifyAdmin } from '../_admin-auth.js'
import { sendMessage } from '../_zoho-mail-handler.js'
import { generateTransactionalEmail, EMAIL_STYLES } from '../../email-template.js'

/**
 * Prospects — /api/admin/prospects
 *
 * The client-hunter agent (.claude/skills/client-hunter) researches leads and
 * inserts them into `prospects` with a drafted email. It never sends. The
 * owner reviews each one here and sends it himself — that approval step is
 * the point: cold mail goes out from the same domain as every client invoice,
 * so nothing leaves without a human reading it.
 *
 * GET  ?status=new|sent|all          → prospects, newest first, plus today's send count
 * POST { id, action: 'send', subject, body }   → sends the (edited) draft, CC media@
 * POST { id, action: 'save', subject, body }   → keeps edits without sending
 * POST { id, action: 'pass' | 'replied' | 'won' | 'opted_out', notes? }
 *
 * Sending fails closed without OUTREACH_POSTAL_ADDRESS: commercial email must
 * carry a physical address and a way to opt out (CAN-SPAM), and the template
 * footer has neither.
 */

const MEDIA_CC = 'media@thelostandunfounds.com'
/** Cold mail per rolling 24h. Low on purpose: a burst is what trips spam filters. */
export const DAILY_SEND_CAP = 15

const MARKS = ['pass', 'replied', 'won', 'opted_out'] as const

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The draft is plain text; each blank-line-separated block becomes a paragraph. */
export function renderOutreachHtml(body: string, postalAddress: string): string {
  const paragraphs = body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="${EMAIL_STYLES.paragraph}">${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  const optOut = `<p style="${EMAIL_STYLES.muted} margin: 24px 0 0 0; text-align: left;">Not interested? Reply "no thanks" and you won't hear from us again.<br>${escapeHtml(postalAddress)}</p>`
  return generateTransactionalEmail(`${paragraphs}\n${optOut}`)
}

async function sentInLastDay(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', since)
  if (error) throw new Error(`Could not count today's sends: ${error.message}`)
  return count || 0
}

function draftFrom(body: Record<string, any>): { subject: string; text: string } {
  const subject = String(body.subject || '').trim()
  const text = String(body.body || '').trim()
  if (!subject) throw Object.assign(new Error('Subject is required'), { status: 400 })
  if (text.length < 40) throw Object.assign(new Error('The email body is too short to send'), { status: 400 })
  return { subject, text }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })
  const supabase = getSupabaseAdmin()

  try {
    if (req.method === 'GET') {
      const status = String(req.query.status || 'new')
      let q = supabase.from('prospects').select('*').order('created_at', { ascending: false }).limit(200)
      if (status === 'sent') q = q.in('status', ['sent', 'replied', 'won'])
      else if (status !== 'all') q = q.in('status', ['new', 'failed'])
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return res.status(200).json({
        prospects: data || [],
        sentToday: await sentInLastDay(supabase),
        dailyCap: DAILY_SEND_CAP,
        canSend: !!process.env.OUTREACH_POSTAL_ADDRESS,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const body = (req.body || {}) as Record<string, any>
    const id = String(body.id || '')
    const action = String(body.action || '')
    if (!id) return res.status(400).json({ error: 'id is required' })

    if ((MARKS as readonly string[]).includes(action)) {
      const patch: Record<string, any> = { status: action, updated_at: new Date().toISOString() }
      if (typeof body.notes === 'string') patch.notes = body.notes
      const { data, error } = await supabase.from('prospects').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return res.status(200).json({ prospect: data })
    }

    if (action === 'save') {
      const { subject, text } = draftFrom(body)
      const { data, error } = await supabase
        .from('prospects')
        .update({ draft_subject: subject, draft_body: text, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return res.status(200).json({ prospect: data })
    }

    if (action !== 'send') return res.status(400).json({ error: `Unknown action: ${action}` })

    const postalAddress = process.env.OUTREACH_POSTAL_ADDRESS
    if (!postalAddress) {
      return res.status(503).json({
        error: 'OUTREACH_POSTAL_ADDRESS is not set in Vercel. Cold email must carry a physical mailing address (CAN-SPAM), so sending is off until it is.',
      })
    }
    const { subject, text } = draftFrom(body)

    const sent = await sentInLastDay(supabase)
    if (sent >= DAILY_SEND_CAP) {
      return res.status(429).json({ error: `Daily cap reached: ${sent} of ${DAILY_SEND_CAP} sent in the last 24 hours.` })
    }

    // Claim the row first so a double tap cannot send twice.
    const { data: claimed, error: claimErr } = await supabase
      .from('prospects')
      .update({ status: 'sending', draft_subject: subject, draft_body: text, updated_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['new', 'failed'])
      .select()
      .maybeSingle()
    if (claimErr) throw new Error(claimErr.message)
    if (!claimed) return res.status(409).json({ error: 'This prospect was already sent or marked.' })
    if (!claimed.contact_email) {
      await supabase.from('prospects').update({ status: 'failed', send_error: 'No contact email' }).eq('id', id)
      return res.status(400).json({ error: 'This prospect has no contact email.' })
    }

    const result = await sendMessage({
      to: claimed.contact_email,
      cc: MEDIA_CC,
      subject,
      content: renderOutreachHtml(text, postalAddress),
      isHtml: true,
    })

    const now = new Date().toISOString()
    if (!result.success) {
      await supabase
        .from('prospects')
        .update({ status: 'failed', send_error: result.error || 'Send failed', updated_at: now })
        .eq('id', id)
      return res.status(502).json({ error: result.error || 'Send failed' })
    }

    const { data: done } = await supabase
      .from('prospects')
      .update({ status: 'sent', sent_at: now, message_id: result.messageId || null, send_error: null, updated_at: now })
      .eq('id', id)
      .select()
      .single()
    return res.status(200).json({ prospect: done, cc: MEDIA_CC, messageId: result.messageId })
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: e?.message || 'Prospects request failed' })
  }
}
