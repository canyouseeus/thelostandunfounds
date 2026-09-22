import { getAdminUser } from '../../lib/api-handlers/_admin-auth.js'
/**
 * POST /api/contracts/admin  — admin-gated contract + template management.
 *
 * Actions (body.action):
 *   list_templates                                  → template[]
 *   save_template   { id?, name, description?, body }
 *   delete_template { id }
 *   list                                            → contract[] with signers
 *   get             { id }                          → contract + signers + events
 *   create          { title, body | template_id, variables?, signers[], client_id?, expires_at? }
 *   send            { id }                          → renders, tokenises, emails
 *   void            { id, reason? }
 *   resend          { id }
 *
 * One function rather than eight files: Vercel's per-deployment function
 * budget is nearly spent, and these all share the same admin gate.
 *
 * Auth: verified Supabase admin session (Authorization: Bearer <token>).
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch {
  // .env.local is local-dev only
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, siteOrigin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js'
import { EMAIL_STYLES } from '../../lib/email-template.js'
import {
  generateToken,
  renderTemplate,
  extractVariables,
  logContractEvent,
  clientIp,
  userAgent,
  type ContractSigner,
} from '../../lib/api-handlers/_contracts-utils.js'

/** Business address of record — every client-facing send is copied here. */
const BUSINESS_CC = 'media@thelostandunfounds.com'

async function isAdmin(req: VercelRequest): Promise<boolean> {
    // Verifies a real Supabase session; never trusts a header as identity.
    return (await getAdminUser(req)) !== null
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function signingUrl(origin: string, token: string): string {
  return `${origin}/sign/${token}`
}

/**
 * Invitation email sent to the party who needs to sign.
 *
 * Uses EMAIL_STYLES.button rather than a hand-rolled style. The first version
 * filled the button with the page colour (#000 on a black email), so the fill
 * was invisible and the CTA rendered as bare text — exactly the failure
 * `email-rendering` RULE 3 warns about. The canonical button is a solid white
 * fill with black type.
 *
 * The raw URL is deliberately not printed: a 43-character signing token
 * wrapped across three lines dominates the message and reads as spam. The
 * button carries the link.
 */
function buildInviteHtml(params: {
  signerName: string
  title: string
  url: string
  expiresAt: string | null
}): string {
  const expiryLine = params.expiresAt
    ? `<p style="${EMAIL_STYLES.muted} margin:0 0 16px;">This link expires on
         ${escapeHtml(new Date(params.expiresAt).toLocaleDateString('en-US', {
           month: 'long', day: 'numeric', year: 'numeric',
         }))}.</p>`
    : ''

  return `
    <p style="${EMAIL_STYLES.paragraph}">${escapeHtml(params.signerName)},</p>
    <p style="${EMAIL_STYLES.paragraph}">
      You have a document ready to review and sign:
      <strong>${escapeHtml(params.title)}</strong>
    </p>
    <p style="margin:0 0 28px;">
      <a href="${escapeHtml(params.url)}" style="${EMAIL_STYLES.button} letter-spacing:1.5px;">
        REVIEW &amp; SIGN
      </a>
    </p>
    ${expiryLine}
    <p style="${EMAIL_STYLES.muted} margin:0;">
      This link is unique to you — please don't forward it. Once signed, you'll get a
      PDF copy for your records.
    </p>
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const body = (req.body || {}) as Record<string, any>
  const action = String(body.action || '')
  const actor = (await getAdminUser(req))?.email || 'admin'

  try {
    // Inside the try so missing service credentials return a readable JSON
    // error instead of an opaque FUNCTION_INVOCATION_FAILED crash.
    const supabase = getSupabaseAdmin()

    switch (action) {
      // ── Templates ────────────────────────────────────────────────────────
      case 'list_templates': {
        const { data, error } = await supabase
          .from('contract_templates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        if (error) throw error
        return res.status(200).json({ templates: data || [] })
      }

      case 'save_template': {
        const name = String(body.name || '').trim()
        const templateBody = String(body.body || '').trim()
        if (!name) return res.status(400).json({ error: 'Template name is required' })
        if (!templateBody) return res.status(400).json({ error: 'Template body is required' })

        const payload = {
          name,
          description: body.description ? String(body.description).trim() : null,
          body: templateBody,
          variables: extractVariables(templateBody),
          updated_at: new Date().toISOString(),
        }

        if (body.id) {
          const { data, error } = await supabase
            .from('contract_templates')
            .update(payload).eq('id', body.id).select('*').single()
          if (error) throw error
          return res.status(200).json({ template: data })
        }

        const { data, error } = await supabase
          .from('contract_templates')
          .insert(payload).select('*').single()
        if (error) throw error
        return res.status(200).json({ template: data })
      }

      case 'delete_template': {
        if (!body.id) return res.status(400).json({ error: 'id is required' })
        // Soft delete: contracts reference the template, and the history of
        // which template produced a signed agreement stays meaningful.
        const { error } = await supabase
          .from('contract_templates')
          .update({ is_active: false }).eq('id', body.id)
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      // ── Contracts ────────────────────────────────────────────────────────
      case 'list': {
        const { data, error } = await supabase
          .from('contracts')
          .select('*, contract_signers(*), clients(name, email)')
          .order('created_at', { ascending: false })
          .limit(200)
        if (error) throw error
        return res.status(200).json({ contracts: data || [] })
      }

      case 'get': {
        if (!body.id) return res.status(400).json({ error: 'id is required' })
        const { data, error } = await supabase
          .from('contracts')
          .select('*, contract_signers(*), clients(name, email)')
          .eq('id', body.id).single()
        if (error || !data) return res.status(404).json({ error: 'Contract not found' })

        const { data: events } = await supabase
          .from('contract_events')
          .select('*').eq('contract_id', body.id)
          .order('created_at', { ascending: true })

        return res.status(200).json({ contract: data, events: events || [] })
      }

      case 'create': {
        const title = String(body.title || '').trim()
        if (!title) return res.status(400).json({ error: 'Title is required' })

        const signersIn = Array.isArray(body.signers) ? body.signers : []
        if (signersIn.length === 0) {
          return res.status(400).json({ error: 'At least one signer is required' })
        }
        for (const s of signersIn) {
          if (!String(s?.name || '').trim()) {
            return res.status(400).json({ error: 'Every signer needs a name' })
          }
          if (!isEmail(String(s?.email || '').trim())) {
            return res.status(400).json({ error: `Invalid email for signer "${s?.name}"` })
          }
        }

        // Resolve the body: an explicit body wins, otherwise render the template.
        let sourceBody = String(body.body || '')
        if (!sourceBody && body.template_id) {
          const { data: tpl, error: tplErr } = await supabase
            .from('contract_templates')
            .select('body').eq('id', body.template_id).single()
          if (tplErr || !tpl) return res.status(400).json({ error: 'Template not found' })
          sourceBody = tpl.body
        }
        if (!sourceBody.trim()) {
          return res.status(400).json({ error: 'Contract body is required' })
        }

        const variables = (body.variables && typeof body.variables === 'object')
          ? body.variables as Record<string, string>
          : {}

        // Snapshot: rendered now, stored, and never re-rendered.
        const rendered = renderTemplate(sourceBody, variables)

        const { data: contract, error: cErr } = await supabase
          .from('contracts')
          .insert({
            template_id: body.template_id || null,
            client_id: body.client_id || null,
            title,
            body: rendered,
            variables,
            status: 'draft',
            expires_at: body.expires_at || null,
            pdf_token: generateToken(),
          })
          .select('*').single()
        if (cErr) throw cErr

        const signerRows = signersIn.map((s: any, i: number) => ({
          contract_id: contract.id,
          name: String(s.name).trim(),
          email: String(s.email).trim().toLowerCase(),
          role: String(s.role || 'client').trim() || 'client',
          sign_order: Number.isFinite(Number(s.sign_order)) ? Number(s.sign_order) : i + 1,
          token: generateToken(),
        }))

        const { error: sErr } = await supabase.from('contract_signers').insert(signerRows)
        if (sErr) {
          // Don't leave a contract with no signers behind.
          await supabase.from('contracts').delete().eq('id', contract.id)
          throw sErr
        }

        await logContractEvent(supabase, {
          contractId: contract.id,
          eventType: 'contract_created',
          actor,
          ip: clientIp(req),
          ua: userAgent(req),
          metadata: { title, signer_count: signerRows.length },
        })

        return res.status(200).json({ contract })
      }

      case 'send':
      case 'resend': {
        if (!body.id) return res.status(400).json({ error: 'id is required' })

        const { data: contract, error } = await supabase
          .from('contracts')
          .select('*, contract_signers(*)')
          .eq('id', body.id).single()
        if (error || !contract) return res.status(404).json({ error: 'Contract not found' })
        if (contract.status === 'voided') {
          return res.status(400).json({ error: 'This contract has been voided' })
        }
        if (contract.status === 'completed') {
          return res.status(400).json({ error: 'This contract is already fully signed' })
        }

        const signers = (contract.contract_signers || []) as ContractSigner[]
        const origin = siteOrigin(req)

        // Sequential routing: only the party whose turn it is gets emailed.
        // With a single signer that is simply that signer.
        const pending = signers
          .filter(s => s.status === 'pending' || s.status === 'viewed')
          .sort((a, b) => a.sign_order - b.sign_order)
        const nextOrder = pending.length ? pending[0].sign_order : null
        const toNotify = pending.filter(s => s.sign_order === nextOrder)

        if (toNotify.length === 0) {
          return res.status(400).json({ error: 'Every signer has already responded' })
        }

        const results: Array<{ email: string; success: boolean; error?: string }> = []
        for (const signer of toNotify) {
          const url = signingUrl(origin, signer.token)
          const sent = await sendTransactionalEmail({
            to: signer.email,
            cc: BUSINESS_CC,
            subject: `Please sign: ${contract.title}`,
            content: buildInviteHtml({
              signerName: signer.name,
              title: contract.title,
              url,
              expiresAt: contract.expires_at,
            }),
          })
          results.push({
            email: signer.email,
            success: sent.success,
            error: sent.success ? undefined : sent.error,
          })

          await logContractEvent(supabase, {
            contractId: contract.id,
            signerId: signer.id,
            eventType: sent.success ? 'invitation_sent' : 'invitation_failed',
            actor,
            ip: clientIp(req),
            ua: userAgent(req),
            metadata: { email: signer.email, provider: sent.provider, error: sent.error },
          })
        }

        const anySent = results.some(r => r.success)
        if (anySent && contract.status === 'draft') {
          await supabase.from('contracts')
            .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', contract.id)
        }

        // Surface partial failure rather than reporting a clean send.
        return res.status(anySent ? 200 : 502).json({
          ok: anySent,
          results,
          error: anySent ? undefined : 'No invitation could be delivered',
        })
      }

      case 'void': {
        if (!body.id) return res.status(400).json({ error: 'id is required' })
        const { data, error } = await supabase
          .from('contracts')
          .update({
            status: 'voided',
            voided_at: new Date().toISOString(),
            void_reason: body.reason ? String(body.reason).trim() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.id).select('*').single()
        if (error) throw error

        await logContractEvent(supabase, {
          contractId: body.id,
          eventType: 'contract_voided',
          actor,
          ip: clientIp(req),
          ua: userAgent(req),
          metadata: { reason: body.reason || null },
        })
        return res.status(200).json({ contract: data })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action || '(none)'}` })
    }
  } catch (e: any) {
    console.error('[contracts/admin] action failed:', action, e?.message || e)
    return res.status(500).json({ error: e?.message || 'Contract operation failed' })
  }
}
