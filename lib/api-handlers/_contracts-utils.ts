/**
 * Shared logic for the contract signing flow.
 *
 * The rules that matter legally live here rather than in any one endpoint:
 *
 *  - A contract's `body` is rendered ONCE, at send time, and never re-rendered
 *    from its template afterwards. If a template is later edited, already-sent
 *    contracts keep the exact text the client agreed to.
 *  - Every meaningful action (sent / viewed / signed / declined / voided) is
 *    appended to `contract_events`. That trail is what backs the certificate of
 *    completion in the PDF.
 *  - Signing tokens are 32 random bytes, compared in constant time.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ContractStatus =
  | 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'declined' | 'voided'

export type SignerStatus = 'pending' | 'viewed' | 'signed' | 'declined'

export interface ContractSigner {
  id: string
  contract_id: string
  name: string
  email: string
  role: string
  sign_order: number
  token: string
  status: SignerStatus
  signature_data: string | null
  signature_type: 'draw' | 'type' | null
  typed_name: string | null
  consent_esign: boolean
  viewed_at: string | null
  signed_at: string | null
  declined_at: string | null
  decline_reason: string | null
  ip_address: string | null
  user_agent: string | null
}

export interface ContractRow {
  id: string
  template_id: string | null
  client_id: string | null
  title: string
  body: string
  variables: Record<string, string>
  status: ContractStatus
  pdf_token: string | null
  sent_at: string | null
  completed_at: string | null
  voided_at: string | null
  void_reason: string | null
  expires_at: string | null
  created_at: string
}

/** URL-safe high-entropy token for signing links and PDF access. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Compare a supplied token against the stored one without leaking length or
 * position through timing. A blank stored token must never match.
 */
export function tokensMatch(supplied: string, stored: string | null | undefined): boolean {
  if (!supplied || !stored) return false
  const a = Buffer.from(String(supplied))
  const b = Buffer.from(String(stored))
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Substitute {{variable}} placeholders in a template body.
 *
 * Unknown placeholders are left visibly intact rather than silently blanked —
 * an obviously unfilled `{{event_date}}` in a draft preview is a bug you catch,
 * whereas an empty gap is one you send to a client.
 */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return String(body || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (whole, key: string) => {
    const value = variables?.[key]
    return value == null || value === '' ? whole : String(value)
  })
}

/** Extract the {{variable}} names a template body references, in order, deduped. */
export function extractVariables(body: string): string[] {
  const found: string[] = []
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(String(body || ''))) !== null) {
    if (!found.includes(m[1])) found.push(m[1])
  }
  return found
}

/** Best-effort client IP from the proxy chain in front of the function. */
export function clientIp(req: { headers: Record<string, any> }): string | null {
  const fwd = req.headers['x-forwarded-for']
  const raw = Array.isArray(fwd) ? fwd[0] : fwd
  if (typeof raw === 'string' && raw.trim()) return raw.split(',')[0].trim()
  const real = req.headers['x-real-ip']
  return typeof real === 'string' && real.trim() ? real.trim() : null
}

export function userAgent(req: { headers: Record<string, any> }): string | null {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 500) : null
}

/**
 * Append an audit event. Deliberately never throws: a failed audit write must
 * not roll back a signature the client already completed. It logs loudly
 * instead, so the gap is visible rather than silent.
 */
export async function logContractEvent(
  supabase: SupabaseClient,
  params: {
    contractId: string
    signerId?: string | null
    eventType: string
    actor?: string | null
    ip?: string | null
    ua?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const { error } = await supabase.from('contract_events').insert({
      contract_id: params.contractId,
      signer_id: params.signerId || null,
      event_type: params.eventType,
      actor: params.actor || null,
      ip_address: params.ip || null,
      user_agent: params.ua || null,
      metadata: params.metadata || {},
    })
    if (error) {
      console.error('[contracts] audit event write failed:', params.eventType, error.message)
    }
  } catch (e: any) {
    console.error('[contracts] audit event threw:', params.eventType, e?.message || e)
  }
}

/**
 * Decide a contract's status from its signers.
 *
 * Written against the whole signer set rather than "the one signer", so adding
 * a second party later needs no change here: the contract completes only when
 * every signer has signed.
 */
export function deriveContractStatus(
  signers: Pick<ContractSigner, 'status'>[],
  current: ContractStatus
): ContractStatus {
  if (current === 'voided' || current === 'draft') return current
  if (signers.some(s => s.status === 'declined')) return 'declined'
  if (signers.length > 0 && signers.every(s => s.status === 'signed')) return 'completed'
  if (signers.some(s => s.status === 'signed' || s.status === 'viewed')) {
    return signers.some(s => s.status === 'signed') ? 'signed' : 'viewed'
  }
  return 'sent'
}

/**
 * The signer whose turn it is, by `sign_order`. With one signer this is simply
 * that signer; with several it enforces sequential routing so party 2 cannot
 * sign before party 1.
 */
export function currentSigner(signers: ContractSigner[]): ContractSigner | null {
  const pending = signers
    .filter(s => s.status === 'pending' || s.status === 'viewed')
    .sort((a, b) => a.sign_order - b.sign_order)
  return pending[0] || null
}

/** True when `signer` is blocked behind an earlier party who has not signed. */
export function isBlockedByEarlierSigner(signer: ContractSigner, signers: ContractSigner[]): boolean {
  return signers.some(s => s.sign_order < signer.sign_order && s.status !== 'signed')
}

export function isExpired(contract: Pick<ContractRow, 'expires_at'>): boolean {
  if (!contract.expires_at) return false
  return new Date(contract.expires_at).getTime() < Date.now()
}

/** Validate a signature payload before it is written. */
export function validateSignaturePayload(payload: {
  signature_type?: string
  signature_data?: string | null
  typed_name?: string | null
  consent_esign?: boolean
}): string | null {
  if (!payload.consent_esign) {
    return 'You must agree to sign electronically before submitting.'
  }
  if (payload.signature_type === 'draw') {
    const data = payload.signature_data || ''
    if (!data.startsWith('data:image/png;base64,')) {
      return 'Signature image is missing or malformed.'
    }
    // A blank pad still produces a valid tiny PNG; require real ink.
    if (data.length < 1500) {
      return 'Your signature looks empty — please sign in the box.'
    }
    return null
  }
  if (payload.signature_type === 'type') {
    if (!payload.typed_name || payload.typed_name.trim().length < 2) {
      return 'Please type your full legal name.'
    }
    return null
  }
  return 'Choose whether to draw or type your signature.'
}
