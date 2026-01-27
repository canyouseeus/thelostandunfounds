import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { PostgrestError } from '@supabase/supabase-js'
import { createServiceSupabaseClient } from '../_supabase-admin-client'
import { createPayoutBatch, isPayoutsEnabled, getPayoutBatchStatus } from './paypal-payouts.js'

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

  // Handle PayPal payout action separately
  if (action === 'pay-via-paypal') {
    return processPayPalPayouts(req, res, supabase, requestIds)
  }

  // Handle status check action
  if (action === 'check-paypal-status') {
    return checkPayPalPayoutStatus(req, res, supabase, requestIds)
  }

  if (!action || !ACTION_STATUS_MAP[action]) {
    return res.status(400).json({ error: 'Invalid action. Use approve, mark-paid, reject, cancel, pay-via-paypal.' })
  }

  const nextStatus = ACTION_STATUS_MAP[action]
  const processedAt = new Date().toISOString()

  const shouldStampProcessedAt = ['paid', 'rejected', 'cancelled'].includes(nextStatus)

  const updatePayload: Record<string, any> = {
    status: nextStatus,
    processed_at: shouldStampProcessedAt ? processedAt : null
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

/**
 * Process payouts via PayPal Payouts API
 */
async function processPayPalPayouts(
  req: VercelRequest,
  res: VercelResponse,
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  requestIds: string[]
) {
  // Check if PayPal Payouts is enabled
  if (!isPayoutsEnabled()) {
    return res.status(400).json({
      error: 'PayPal Payouts is not enabled. Set PAYPAL_PAYOUTS_ENABLED=true and configure PayPal credentials.'
    })
  }

  // Get payout requests with approved status
  const { data: requests, error: fetchError } = await supabase
    .from('payout_requests')
    .select('id, affiliate_id, affiliate_code, amount, currency, paypal_email, notes')
    .in('id', requestIds)
    .eq('status', 'approved')

  if (fetchError && !isMissingTable(fetchError)) {
    throw fetchError
  }

  if (!requests || requests.length === 0) {
    return res.status(400).json({
      error: 'No approved payout requests found. Requests must be approved before paying via PayPal.'
    })
  }

  // Build payout items
  const payoutItems = requests.map(req => ({
    requestId: req.id,
    affiliateCode: req.affiliate_code,
    amount: parseFloat(req.amount),
    currency: req.currency || 'USD',
    paypalEmail: req.paypal_email,
    note: req.notes || undefined,
  }))

  try {
    // Create PayPal payout batch
    const batchResult = await createPayoutBatch(payoutItems)
    const batchId = batchResult.batch_header.payout_batch_id

    // Update payout requests with batch ID and set status to 'paid'
    // (PayPal processes immediately for most payouts)
    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status: 'paid',
        paypal_payout_batch_id: batchId,
        processed_at: new Date().toISOString(),
      })
      .in('id', requestIds)

    if (updateError && !isMissingTable(updateError)) {
      console.error('Failed to update payout requests after PayPal batch creation:', updateError)
      // Don't throw - the PayPal payout was still created
    }

    // Deduct from affiliate total_earnings
    for (const req of requests) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('total_earnings')
        .eq('id', req.affiliate_id)
        .single()

      if (affiliate) {
        const newEarnings = Math.max(0, (parseFloat(affiliate.total_earnings) || 0) - parseFloat(req.amount))
        await supabase
          .from('affiliates')
          .update({ total_earnings: newEarnings })
          .eq('id', req.affiliate_id)
      }
    }

    return res.status(200).json({
      success: true,
      batchId,
      batchStatus: batchResult.batch_header.batch_status,
      processedCount: requests.length,
      totalAmount: payoutItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
    })
  } catch (error: any) {
    console.error('PayPal payout batch creation failed:', error)

    // Mark requests as failed
    await supabase
      .from('payout_requests')
      .update({
        status: 'approved', // Keep as approved so admin can retry
        error_message: error?.message || 'PayPal payout failed',
      })
      .in('id', requestIds)

    return res.status(500).json({
      error: 'PayPal payout failed',
      message: error?.message || 'Unknown error',
    })
  }
}

/**
 * Check PayPal payout status for requests
 */
async function checkPayPalPayoutStatus(
  req: VercelRequest,
  res: VercelResponse,
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  requestIds: string[]
) {
  // Get payout requests with batch IDs
  const { data: requests, error: fetchError } = await supabase
    .from('payout_requests')
    .select('id, paypal_payout_batch_id, status')
    .in('id', requestIds)
    .not('paypal_payout_batch_id', 'is', null)

  if (fetchError && !isMissingTable(fetchError)) {
    throw fetchError
  }

  if (!requests || requests.length === 0) {
    return res.status(400).json({
      error: 'No payout requests found with PayPal batch IDs'
    })
  }

  // Get unique batch IDs
  const batchIds = [...new Set(requests.map(r => r.paypal_payout_batch_id))]
  const statuses: Record<string, any> = {}

  for (const batchId of batchIds) {
    try {
      const status = await getPayoutBatchStatus(batchId)
      statuses[batchId] = status
    } catch (error: any) {
      statuses[batchId] = { error: error?.message || 'Failed to get status' }
    }
  }

  return res.status(200).json({
    batchStatuses: statuses,
    requestCount: requests.length,
  })
}
