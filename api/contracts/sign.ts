/**
 * Public signing endpoint. No auth — the 32-byte signing token IS the
 * credential, so everything here is written defensively.
 *
 *   GET  /api/contracts/sign?token=…            → the contract to review
 *   POST /api/contracts/sign  { token, ... }    → sign or decline
 *
 * Guarantees:
 *  - The token is looked up, then re-compared in constant time.
 *  - Only the contract text, the signer's own name/email and status are
 *    returned. Other signers are exposed as name + status only, never tokens.
 *  - A signed signer cannot be overwritten: signatures are write-once.
 *  - Voided, expired and out-of-turn contracts are refused with a clear reason.
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
import {
  tokensMatch,
  logContractEvent,
  clientIp,
  userAgent,
  deriveContractStatus,
  isBlockedByEarlierSigner,
  isExpired,
  validateSignaturePayload,
  type ContractSigner,
} from '../../lib/api-handlers/_contracts-utils.js'

const BUSINESS_CC = 'media@thelostandunfounds.com'
/** Reject oversized signature payloads before they reach the database. */
const MAX_SIGNATURE_BYTES = 400_000

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Load contract + all signers from a signing token, or explain the refusal. */
async function loadByToken(supabase: ReturnType<typeof getSupabaseAdmin>, token: string) {
  const { data: signer } = await supabase
    .from('contract_signers').select('*').eq('token', token).maybeSingle()

  // Re-compare in constant time. The equality lookup above is the index hit;
  // this is the check that decides.
  if (!signer || !tokensMatch(token, signer.token)) {
    return { error: 'This signing link is not valid.', code: 404 as const }
  }

  const { data: contract } = await supabase
    .from('contracts').select('*').eq('id', signer.contract_id).maybeSingle()
  if (!contract) return { error: 'This document is no longer available.', code: 404 as const }

  const { data: allSigners } = await supabase
    .from('contract_signers').select('*')
    .eq('contract_id', contract.id).order('sign_order', { ascending: true })

  return {
    signer: signer as ContractSigner,
    contract,
    signers: (allSigners || []) as ContractSigner[],
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // A signing link must never be cached by a shared proxy.
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = String(
    (req.method === 'GET' ? req.query.token : (req.body || {}).token) || ''
  ).trim()
  if (!token) return res.status(400).json({ error: 'Missing signing token.' })

  const supabase = getSupabaseAdmin()

  try {
    const loaded = await loadByToken(supabase, token)
    if ('error' in loaded) return res.status(loaded.code).json({ error: loaded.error })
    const { signer, contract, signers } = loaded

    // ── Review ────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      // Stamp first view exactly once, so "viewed" means the first time.
      if (signer.status === 'pending') {
        await supabase.from('contract_signers')
          .update({ status: 'viewed', viewed_at: new Date().toISOString() })
          .eq('id', signer.id).eq('status', 'pending')

        await logContractEvent(supabase, {
          contractId: contract.id,
          signerId: signer.id,
          eventType: 'document_viewed',
          actor: signer.email,
          ip: clientIp(req),
          ua: userAgent(req),
        })

        if (contract.status === 'sent') {
          await supabase.from('contracts')
            .update({ status: 'viewed', updated_at: new Date().toISOString() })
            .eq('id', contract.id).eq('status', 'sent')
        }
      }

      return res.status(200).json({
        contract: {
          id: contract.id,
          title: contract.title,
          body: contract.body,
          status: contract.status,
          sent_at: contract.sent_at,
          expires_at: contract.expires_at,
          completed_at: contract.completed_at,
        },
        signer: {
          name: signer.name,
          email: signer.email,
          role: signer.role,
          status: signer.status,
          signed_at: signer.signed_at,
          signature_data: signer.status === 'signed' ? signer.signature_data : null,
          typed_name: signer.status === 'signed' ? signer.typed_name : null,
        },
        // Other parties: enough to show progress, never their tokens.
        otherSigners: signers
          .filter(s => s.id !== signer.id)
          .map(s => ({ name: s.name, role: s.role, status: s.status, sign_order: s.sign_order })),
        // Why the form should be locked, if it should be.
        blocked:
          contract.status === 'voided' ? 'voided'
          : isExpired(contract) ? 'expired'
          : signer.status === 'signed' ? 'already_signed'
          : signer.status === 'declined' ? 'declined'
          : isBlockedByEarlierSigner(signer, signers) ? 'awaiting_other_signer'
          : null,
        pdfUrl: signer.status === 'signed' && contract.pdf_token
          ? `${siteOrigin(req)}/api/contracts/pdf?id=${contract.id}&token=${contract.pdf_token}`
          : null,
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // ── Sign / decline ────────────────────────────────────────────────────
    const body = (req.body || {}) as Record<string, any>

    if (contract.status === 'voided') {
      return res.status(409).json({ error: 'This document has been voided and can no longer be signed.' })
    }
    if (isExpired(contract)) {
      return res.status(409).json({ error: 'This signing link has expired. Please request a new one.' })
    }
    if (signer.status === 'signed') {
      return res.status(409).json({ error: 'You have already signed this document.' })
    }
    if (signer.status === 'declined') {
      return res.status(409).json({ error: 'You have already declined this document.' })
    }
    if (isBlockedByEarlierSigner(signer, signers)) {
      return res.status(409).json({ error: 'Another party must sign before you.' })
    }

    const ip = clientIp(req)
    const ua = userAgent(req)

    if (body.decline === true) {
      await supabase.from('contract_signers').update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: body.reason ? String(body.reason).trim().slice(0, 1000) : null,
        ip_address: ip,
        user_agent: ua,
      }).eq('id', signer.id)

      await supabase.from('contracts')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', contract.id)

      await logContractEvent(supabase, {
        contractId: contract.id,
        signerId: signer.id,
        eventType: 'document_declined',
        actor: signer.email,
        ip, ua,
        metadata: { reason: body.reason || null },
      })

      await sendTransactionalEmail({
        to: BUSINESS_CC,
        subject: `Contract declined: ${contract.title}`,
        content:
          `<p style="font-size:15px;">${escapeHtml(signer.name)} (${escapeHtml(signer.email)}) ` +
          `declined <strong>${escapeHtml(contract.title)}</strong>.</p>` +
          (body.reason
            ? `<p style="font-size:14px;color:#555;">Reason: ${escapeHtml(body.reason)}</p>`
            : ''),
      })

      return res.status(200).json({ ok: true, status: 'declined' })
    }

    const signatureData: string | null = body.signature_data ? String(body.signature_data) : null
    if (signatureData && signatureData.length > MAX_SIGNATURE_BYTES) {
      return res.status(413).json({ error: 'Signature image is too large.' })
    }

    const invalid = validateSignaturePayload({
      signature_type: body.signature_type,
      signature_data: signatureData,
      typed_name: body.typed_name,
      consent_esign: body.consent_esign === true,
    })
    if (invalid) return res.status(400).json({ error: invalid })

    const signedAt = new Date().toISOString()

    // Write-once: the `.eq('status', ...)` guard means a double submit (or a
    // replayed request) cannot overwrite an existing signature.
    const { data: updated, error: updateErr } = await supabase
      .from('contract_signers')
      .update({
        status: 'signed',
        signature_data: body.signature_type === 'draw' ? signatureData : null,
        signature_type: body.signature_type,
        typed_name: body.typed_name ? String(body.typed_name).trim().slice(0, 200) : null,
        consent_esign: true,
        signed_at: signedAt,
        ip_address: ip,
        user_agent: ua,
      })
      .eq('id', signer.id)
      .in('status', ['pending', 'viewed'])
      .select('*')

    if (updateErr) throw updateErr
    if (!updated || updated.length === 0) {
      return res.status(409).json({ error: 'This document has already been signed.' })
    }

    await logContractEvent(supabase, {
      contractId: contract.id,
      signerId: signer.id,
      eventType: 'document_signed',
      actor: signer.email,
      ip, ua,
      metadata: { method: body.signature_type },
    })

    // Recompute contract status across ALL signers.
    const refreshed = signers.map(s => (s.id === signer.id ? { ...s, status: 'signed' as const } : s))
    const nextStatus = deriveContractStatus(refreshed, contract.status)
    const isComplete = nextStatus === 'completed'

    await supabase.from('contracts').update({
      status: nextStatus,
      completed_at: isComplete ? signedAt : contract.completed_at,
      updated_at: signedAt,
    }).eq('id', contract.id)

    const origin = siteOrigin(req)
    const pdfUrl = contract.pdf_token
      ? `${origin}/api/contracts/pdf?id=${contract.id}&token=${contract.pdf_token}`
      : null

    // Confirmation to the signer, with their copy.
    await sendTransactionalEmail({
      to: signer.email,
      cc: BUSINESS_CC,
      subject: `Signed: ${contract.title}`,
      content:
        `<p style="font-size:16px;">${escapeHtml(signer.name)},</p>` +
        `<p style="font-size:15px;line-height:1.6;">Thank you — your signature on ` +
        `<strong>${escapeHtml(contract.title)}</strong> has been recorded.</p>` +
        (pdfUrl
          ? `<p style="margin:24px 0;"><a href="${escapeHtml(pdfUrl)}" ` +
            `style="display:inline-block;background:#000;color:#fff;text-decoration:none;` +
            `padding:14px 28px;font-size:14px;letter-spacing:1.5px;font-weight:bold;">` +
            `DOWNLOAD SIGNED PDF</a></p>`
          : '') +
        `<p style="font-size:13px;color:#555;line-height:1.6;">A copy is on file with ` +
        `THE LOST+UNFOUNDS. Reply to this email with any questions.</p>`,
    })

    if (isComplete) {
      await logContractEvent(supabase, {
        contractId: contract.id,
        eventType: 'contract_completed',
        actor: 'system',
        metadata: { signer_count: refreshed.length },
      })
    }

    return res.status(200).json({
      ok: true,
      status: nextStatus,
      completed: isComplete,
      pdfUrl,
    })
  } catch (e: any) {
    console.error('[contracts/sign] failed:', e?.message || e)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
