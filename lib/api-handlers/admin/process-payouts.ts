import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '../_supabase-admin-client'

const isMissingTable = (error?: PostgrestError | null) =>
  Boolean(error?.message && error.message.toLowerCase().includes('does not exist'))

const ACTION_STATUS_MAP: Record<string, 'approved' | 'paid' | 'rejected' | 'cancelled'> = {
  approve: 'approved',
  'mark-paid': 'paid',
  reject: 'rejected',
  cancel: 'cancelled'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return getPayoutRequests(req, res)
    }
    if (req.method === 'POST') {
      return updatePayoutRequests(req, res)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Process payouts handler error:', error)
    return res
      .status(500)
      .json({ error: error?.message || 'Failed to process payout requests' })
  }
}

async function getPayoutRequests(req: VercelRequest, res: VercelResponse) {
  const supabase = createServiceSupabaseClient()
  const statusParam = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status
  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

  let query = supabase
    .from('payout_requests')
    .select(
      'id, affiliate_id, affiliate_code, amount, status, paypal_email, notes, processed_at, created_at, affiliates(affiliate_code, user_id, status)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusParam) {
    query = query.eq('status', statusParam)
  }

  const [requestsResult, pendingCountResult] = await Promise.all([
    query,
    supabase
      .from('payout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
  ])

  if (requestsResult.error && !isMissingTable(requestsResult.error)) {
    throw requestsResult.error
  }
  if (pendingCountResult.error && !isMissingTable(pendingCountResult.error)) {
    throw pendingCountResult.error
  }

  return res.status(200).json({
    requests: requestsResult.data ?? [],
    pendingCount: pendingCountResult.count || 0
  })
}

async function updatePayoutRequests(req: VercelRequest, res: VercelResponse) {
  const supabase = createServiceSupabaseClient()
  const { requestIds, action, note } = req.body ?? {}

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    return res.status(400).json({ error: 'requestIds must include at least one id' })
  }

  if (!action || !ACTION_STATUS_MAP[action]) {
    return res.status(400).json({ error: 'Invalid action. Use approve, mark-paid, reject, cancel.' })
  }

  const nextStatus = ACTION_STATUS_MAP[action]
  const processedAt = new Date().toISOString()

  const updatePayload: Record<string, any> = {
    status: nextStatus,
    processed_at: nextStatus === 'pending' ? null : processedAt
  }

  if (typeof note === 'string' && note.trim().length > 0) {
    updatePayload.notes = note.trim()
  }

  const updateResult = await supabase
    .from('payout_requests')
    .update(updatePayload)
    .in('id', requestIds)
    .select('id, status, processed_at, notes')

  if (updateResult.error && !isMissingTable(updateResult.error)) {
    throw updateResult.error
  }

  return res.status(200).json({
    updated: updateResult.data?.length || 0,
    status: nextStatus,
    requests: updateResult.data ?? []
  })
}
