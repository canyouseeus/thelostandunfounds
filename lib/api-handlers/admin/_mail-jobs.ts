import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getFolders,
  getMessages,
  searchMessages,
  getMessage,
  sendMessage,
} from '../_zoho-mail-handler.js'
import { generateTransactionalEmail } from '../../email-template.js'
import type { JobOutcome } from './_jobs.js'

/**
 * Zoho mailbox work an agent can queue in `admin_jobs`, so a session can read
 * and answer the owner's mail without his browser (owner, 2026-11-12: "Can you
 * build the endpoint without me?").
 *
 * Same gate as every other admin job: only rows the owner's Supabase connector
 * inserts, run by /api/cron/admin-jobs on CRON_SECRET. No new secret, no new
 * public route, no change to verifyAdmin (see CLAUDE.md "ADMIN WORK RULE").
 *
 * Reads: mail_folders, mail_list, mail_search, mail_read.
 * Send:  mail_send. Sends as admin@ unless `from` is given, to exactly the
 * recipients in the payload, plaintext unless `branded: true`. Needs an
 * idempotency_key on the job row, and is capped at SEND_LIMIT_PER_HOUR.
 * Each send logs to, cc, subject and time, never the body.
 */

const ADMIN_FROM = 'admin@thelostandunfounds.com'
const SEND_LIMIT_PER_HOUR = 10
const MAX_BODY_CHARS = 50_000
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

const ok = (result: unknown): JobOutcome => ({ status: 'done', httpStatus: 200, result })
const fail = (error: string, httpStatus = 400): JobOutcome => ({ status: 'failed', httpStatus, error })

/** Normalise a recipient field to a comma list, refusing anything not a plain address. */
function recipients(value: unknown, field: string): { list?: string; error?: string } {
  if (value === undefined || value === null || value === '') return {}
  const parts = (Array.isArray(value) ? value : String(value).split(','))
    .map((s) => String(s).trim())
    .filter(Boolean)
  const bad = parts.filter((p) => !EMAIL_RE.test(p))
  if (bad.length) return { error: `${field} has an invalid address` }
  if (parts.length > 10) return { error: `${field} has more than 10 addresses` }
  return { list: parts.join(',') }
}

type MailAction = (...args: [SupabaseClient, Record<string, any>, string]) => Promise<JobOutcome>

export const MAIL_JOB_ACTIONS: Record<string, MailAction> = {
  /** Read-only. { } */
  async mail_folders() {
    const r = await getFolders()
    return r.success ? ok({ folders: r.folders }) : fail(r.error || 'folders failed', 502)
  },

  /** Read-only. { folderId, limit?=25 (max 100), start?=0 } */
  async mail_list(_s, payload) {
    if (!payload.folderId) return fail('folderId is required (see mail_folders)')
    const limit = Math.min(Math.max(parseInt(payload.limit, 10) || 25, 1), 100)
    const start = Math.max(parseInt(payload.start, 10) || 0, 0)
    const r = await getMessages(String(payload.folderId), limit, start)
    return r.success ? ok({ messages: r.messages }) : fail(r.error || 'list failed', 502)
  },

  /**
   * Read-only. { query, folderId?, limit?=25 (max 100), start?=0 }
   * Zoho search syntax: plain words give a 400, use a prefix such as
   * "entire:tent" or "sender:capitolcrew.com".
   */
  async mail_search(_s, payload) {
    if (!payload.query) return fail('query is required, e.g. "sender:example.com" or "entire:word"')
    const limit = Math.min(Math.max(parseInt(payload.limit, 10) || 25, 1), 100)
    const r = await searchMessages({
      query: String(payload.query),
      folderId: payload.folderId ? String(payload.folderId) : undefined,
      limit,
      start: Math.max(parseInt(payload.start, 10) || 0, 0),
    })
    return r.success ? ok({ messages: r.messages }) : fail(r.error || 'search failed', 502)
  },

  /** Read-only. { messageId, folderId? } — ids as strings (they exceed JS's safe integer). */
  async mail_read(_s, payload) {
    if (!payload.messageId) return fail('messageId is required')
    const r = await getMessage(String(payload.messageId), payload.folderId ? String(payload.folderId) : undefined)
    if (!r.success || !r.message) return fail(r.error || 'read failed', 502)
    const m = r.message
    const content = (m.content || '').slice(0, MAX_BODY_CHARS)
    return ok({
      messageId: m.messageId,
      folderId: m.folderId,
      from: m.fromAddress || m.from,
      to: m.toAddress || m.to,
      cc: m.cc,
      subject: m.subject,
      receivedTime: m.receivedTime,
      attachments: (m.attachments || []).map((a) => ({ name: a.attachmentName, size: a.attachmentSize })),
      content,
      truncated: (m.content || '').length > MAX_BODY_CHARS,
    })
  },

  /**
   * Sends mail as the owner. { to, cc?, bcc?, subject, content, from?, branded?, inReplyTo? }
   * - from defaults to admin@ (Zoho's own default would be media@).
   * - content is plain text unless branded: true, which wraps it (as HTML) in
   *   the site's transactional template.
   * - No attachments. The job row must carry an idempotency_key.
   */
  async mail_send(supabase, payload, jobId) {
    const { data: job, error: jobError } = await supabase
      .from('admin_jobs').select('idempotency_key').eq('id', jobId).maybeSingle()
    if (jobError) return fail(`could not read job: ${jobError.message}`, 500)
    if (!job?.idempotency_key) return fail('mail_send needs an idempotency_key on the job row')

    const to = recipients(payload.to, 'to')
    const cc = recipients(payload.cc, 'cc')
    const bcc = recipients(payload.bcc, 'bcc')
    const err = to.error || cc.error || bcc.error
    if (err) return fail(err)
    if (!to.list) return fail('to is required')
    if (!payload.subject || typeof payload.subject !== 'string') return fail('subject is required')
    if (!payload.content || typeof payload.content !== 'string') return fail('content is required')
    if (payload.attachments) return fail('attachments are not supported by mail_send')

    const from = payload.from ? recipients(payload.from, 'from') : { list: ADMIN_FROM }
    if (from.error || !from.list || from.list.includes(',')) return fail('from must be one address')
    if (!from.list.toLowerCase().endsWith('@thelostandunfounds.com')) {
      return fail('from must be a thelostandunfounds.com address')
    }

    // Rate limit: sends finished in the last hour, this job excluded.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('admin_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'mail_send')
      .eq('status', 'done')
      .gte('finished_at', since)
    if (countError) return fail(`rate check failed: ${countError.message}`, 500)
    if ((count || 0) >= SEND_LIMIT_PER_HOUR) {
      return fail(`rate limit: ${SEND_LIMIT_PER_HOUR} sends per hour reached`, 429)
    }

    const branded = payload.branded === true
    const result = await sendMessage({
      from: from.list,
      to: to.list,
      cc: cc.list,
      bcc: bcc.list,
      subject: payload.subject,
      content: branded ? generateTransactionalEmail(payload.content) : payload.content,
      isHtml: branded,
      inReplyTo: payload.inReplyTo ? String(payload.inReplyTo) : undefined,
    })

    console.log('[mail_send]', JSON.stringify({
      jobId, at: new Date().toISOString(), from: from.list, to: to.list,
      cc: cc.list || null, bcc: bcc.list ? 'set' : null, subject: payload.subject,
      branded, ok: result.success,
    }))

    if (!result.success) return fail(result.error || 'send failed', 502)
    return ok({ sent: true, from: from.list, to: to.list, cc: cc.list || null, subject: payload.subject, messageId: result.messageId })
  },
}
