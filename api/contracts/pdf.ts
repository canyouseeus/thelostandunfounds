/**
 * GET /api/contracts/pdf?id=<contractId>&token=<pdf_token>
 *
 * Streams the branded contract PDF with signature blocks and the certificate
 * of completion. The token stored on the contract row guards the endpoint so
 * contracts are not enumerable. Regenerated per request: nothing is stored.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch {
  // .env.local is local-dev only
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { generateContractPdf } from '../../lib/api-handlers/_contract-pdf.js'
import { tokensMatch, type ContractSigner } from '../../lib/api-handlers/_contracts-utils.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = String(req.query.id || '')
  const token = String(req.query.token || '')
  if (!id || !token) return res.status(400).json({ error: 'id and token are required' })

  try {
    const supabase = getSupabaseAdmin()

    const { data: contract, error } = await supabase
      .from('contracts').select('*').eq('id', id).maybeSingle()
    if (error || !contract) return res.status(404).json({ error: 'Contract not found' })

    // A missing or blank pdf_token must never match.
    if (!tokensMatch(token, contract.pdf_token)) {
      return res.status(403).json({ error: 'Invalid token' })
    }

    const { data: signers } = await supabase
      .from('contract_signers').select('*')
      .eq('contract_id', id).order('sign_order', { ascending: true })

    const { data: events } = await supabase
      .from('contract_events')
      .select('event_type, actor, ip_address, created_at')
      .eq('contract_id', id).order('created_at', { ascending: true })

    const pdf = await generateContractPdf({
      contract: contract as any,
      signers: (signers || []) as ContractSigner[],
      events: events || [],
    })

    const safeTitle = String(contract.title || 'contract')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'contract'

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdf.length)
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.setHeader('Content-Disposition', `inline; filename="${safeTitle}-signed.pdf"`)
    return res.status(200).send(pdf)
  } catch (e: any) {
    console.error('[contracts/pdf] failed:', e?.message || e)
    return res.status(500).json({ error: 'Failed to generate PDF' })
  }
}
