import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Fourthwall Webhook Handler
 * 
 * Processes order webhooks from Fourthwall and creates affiliate commissions
 * 
 * Webhook events:
 * - order.created: New order placed
 * - order.fulfilled: Order fulfilled
 * - order.cancelled: Order cancelled
 * - order.refunded: Order refunded
 * - payment.disputed / order.chargeback: Payment chargeback
 */

// Holding periods for commissions (in days)
const HOLD_PERIOD_PHYSICAL = parseInt(process.env.HOLD_PERIOD_PHYSICAL_DAYS || '30', 10)
const HOLD_PERIOD_DIGITAL = parseInt(process.env.HOLD_PERIOD_DIGITAL_DAYS || '7', 10)

type CancellationReason = 
  | 'Order cancelled'
  | 'Order refunded'
  | 'Payment disputed'
  | 'Chargeback'
  | 'Fraud detected'
  | 'Manual cancellation'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow GET for health checks / verification
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Fourthwall webhook endpoint is active',
      methods: ['POST'],
      holdPeriods: {
        physical: HOLD_PERIOD_PHYSICAL,
        digital: HOLD_PERIOD_DIGITAL
      }
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature (if Fourthwall provides one)
    const webhookSecret = process.env.FOURTHWALL_WEBHOOK_SECRET
    if (webhookSecret) {
      // TODO: Add signature verification when Fourthwall webhook secret is available
      // const signature = req.headers['x-fourthwall-signature']
      // if (!verifySignature(req.body, signature, webhookSecret)) {
      //   return res.status(401).json({ error: 'Invalid signature' })
      // }
    }

    const event = req.body
    const eventType = event.type || event.event_type

    console.log('Fourthwall webhook received:', eventType)

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle different event types
    switch (eventType) {
      // Order events - create commission
      case 'order.created':
      case 'order.fulfilled':
      case 'order.updated':
      case 'ORDER_PLACED':
      case 'ORDER_UPDATED':
        await handleOrderCreated(supabase as any, event)
        break

      // Cancellation events
      case 'order.cancelled':
      case 'ORDER_CANCELLED':
        await handleCommissionCancellation(supabase as any, event, 'Order cancelled')
        break

      // Refund events
      case 'order.refunded':
      case 'ORDER_REFUNDED':
      case 'refund.created':
      case 'REFUND_CREATED':
        await handleCommissionCancellation(supabase as any, event, 'Order refunded')
        break

      // Chargeback/dispute events
      case 'payment.disputed':
      case 'PAYMENT_DISPUTED':
      case 'order.chargeback':
      case 'ORDER_CHARGEBACK':
      case 'chargeback.created':
      case 'CHARGEBACK_CREATED':
        await handleCommissionCancellation(supabase as any, event, 'Chargeback')
        break

      // Product events - log but don't process
      case 'PRODUCT_CREATED':
      case 'PRODUCT_UPDATED':
        console.log(`Product event received: ${eventType} - No action needed for affiliate tracking`)
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error processing Fourthwall webhook:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}

/**
 * Handle order created/fulfilled/updated event
 */
async function handleOrderCreated(
  supabase: ReturnType<typeof createClient>,
  event: any
) {
  console.log('Order event data structure:', JSON.stringify(event, null, 2))
  
  const order = event.data || event.order || event.payload || event
  const orderId = (order.id || order.order_id || order.orderId || '') as string
  
  // Check order status
  const orderStatus = order.status || order.order_status || order.orderStatus || order.state
  
  if (!orderStatus) {
    console.log('Processing order without status (assuming ORDER_PLACED means ready to process)')
  } else if (orderStatus === 'cancelled' || orderStatus === 'refunded' || orderStatus === 'CANCELLED') {
    await handleCommissionCancellation(supabase, event, 'Order cancelled')
    return
  } else if (orderStatus !== 'fulfilled' && orderStatus !== 'completed' && orderStatus !== 'paid' && 
             orderStatus !== 'CONFIRMED' && orderStatus !== 'confirmed') {
    console.log(`Order ${orderId} status is ${orderStatus}, skipping commission creation`)
    return
  }
  
  const affiliateRef = order.affiliate_ref || order.ref || order.affiliate_code || 
                       order.metadata?.affiliate_ref || order.custom_fields?.affiliate_ref

  if (!affiliateRef) {
    console.log('No affiliate reference in order:', orderId)
    return
  }

  // Find affiliate by code
  const { data: affiliate, error: affiliateError } = await (supabase as any)
    .from('affiliates')
    .select('id, commission_rate')
    .eq('code', affiliateRef)
    .eq('status', 'active')
    .single() as { data: { id: string; commission_rate: number } | null; error: any }

  if (affiliateError || !affiliate) {
    console.warn(`Affiliate not found: ${affiliateRef}`, affiliateError)
    return
  }

  const affiliateId = affiliate.id as string
  const commissionRate = (affiliate.commission_rate as number) / 100

  // Calculate commission from order items and determine product type
  const lineItems = order.line_items || order.items || []
  let totalCommission = 0
  let totalProfit = 0
  let hasPhysicalProduct = false
  let hasDigitalProduct = false

  for (const item of lineItems) {
    const productId = item.product_id || item.product?.id
    const variantId = item.variant_id || item.variant?.id
    const quantity = item.quantity || 1
    const price = parseFloat(item.price || item.unit_price || 0)

    // Get product cost and type
    const { data: productCost } = await (supabase as any)
      .from('product_costs')
      .select('cost, product_type')
      .eq('product_id', productId)
      .eq('variant_id', variantId || '')
      .eq('source', 'fourthwall')
      .single() as { data: { cost: number; product_type?: string } | null }

    const cost = productCost ? (productCost.cost as number) : 0
    const productType = productCost?.product_type || 'physical'
    
    // Track product types for hold period determination
    if (productType === 'digital') {
      hasDigitalProduct = true
    } else {
      hasPhysicalProduct = true
    }

    const profit = (price - cost) * quantity
    totalProfit += profit

    // Calculate commission (% of profit)
    const commission = profit * commissionRate
    totalCommission += commission
  }

  if (totalCommission <= 0) {
    console.log('No commission to record for order:', orderId)
    return
  }

  // Determine hold period based on product types
  // If order contains ANY physical products, use physical hold period (30 days)
  // Digital-only orders use digital hold period (7 days)
  const holdDays = hasPhysicalProduct ? HOLD_PERIOD_PHYSICAL : HOLD_PERIOD_DIGITAL
  const availableDate = new Date()
  availableDate.setDate(availableDate.getDate() + holdDays)

  // Create commission record with available_date
  const { data: newCommission, error: commissionError } = await (supabase as any)
    .from('affiliate_commissions')
    .insert({
      affiliate_id: affiliateId,
      order_id: orderId,
      amount: totalCommission,
      profit_generated: totalProfit,
      source: 'fourthwall',
      product_cost: totalProfit > 0 ? (totalProfit - totalCommission / commissionRate) : 0,
      status: 'pending',
      available_date: availableDate.toISOString(),
    } as any)
    .select('id')
    .single()

  if (commissionError) {
    console.error('Error creating commission:', commissionError)
    throw commissionError
  }

  // Log commission creation
  await logCommissionStatusChange(supabase, newCommission.id, null, 'pending', 'Commission created', {
    order_id: orderId,
    hold_days: holdDays,
    available_date: availableDate.toISOString(),
    has_physical: hasPhysicalProduct,
    has_digital: hasDigitalProduct
  })

  // Note: We do NOT update total_earnings here anymore
  // total_earnings only reflects what's actually been paid out
  // The available balance is calculated from commissions table directly

  // Update conversion count only
  const { data: currentAffiliate } = await (supabase as any)
    .from('affiliates')
    .select('total_conversions')
    .eq('id', affiliateId)
    .single() as { data: { total_conversions: number } | null }

  if (currentAffiliate) {
    await (supabase as any)
      .from('affiliates')
      .update({
        total_conversions: ((currentAffiliate.total_conversions as number) || 0) + 1,
      } as any)
      .eq('id', affiliateId)
  }

  // Update KING MIDAS daily stats
  const today = new Date().toISOString().split('T')[0]
  await updateKingMidasStats(supabase as any, affiliateId, totalProfit, today)

  console.log(`Commission created: $${totalCommission.toFixed(2)} for affiliate ${affiliateRef} from order ${orderId} (available after ${holdDays} days)`)
}

/**
 * Handle commission cancellation (cancelled, refunded, chargeback)
 */
async function handleCommissionCancellation(
  supabase: ReturnType<typeof createClient>,
  event: any,
  reason: CancellationReason
) {
  const order = event.data || event.order || event
  const orderId = (order.id || order.order_id || '') as string

  if (!orderId) {
    console.warn('No order ID in cancellation event')
    return
  }

  // Find commissions for this order
  const { data: commissions, error: findError } = await (supabase as any)
    .from('affiliate_commissions')
    .select('id, affiliate_id, amount, status')
    .eq('order_id', orderId)
    .eq('source', 'fourthwall')
    .neq('status', 'cancelled') as { data: Array<{ id: string; affiliate_id: string; amount: number; status: string }> | null; error: any }

  if (findError) {
    console.error('Error finding commissions:', findError)
    return
  }

  if (!commissions || commissions.length === 0) {
    console.log(`No active commissions found for order ${orderId}`)
    return
  }

  // Cancel each commission
  for (const commission of commissions) {
    const previousStatus = commission.status

    // Update commission status
    const { error: updateError } = await (supabase as any)
      .from('affiliate_commissions')
      .update({
        status: 'cancelled',
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString()
      } as any)
      .eq('id', commission.id)

    if (updateError) {
      console.error('Error cancelling commission:', updateError)
      continue
    }

    // Log status change
    await logCommissionStatusChange(supabase, commission.id, previousStatus, 'cancelled', reason, {
      order_id: orderId,
      event_type: event.type || event.event_type
    })

    // If commission was already paid, we have a problem - log for manual review
    if (previousStatus === 'paid') {
      console.error(`ALERT: Cancellation/chargeback on PAID commission! Order: ${orderId}, Commission: ${commission.id}, Amount: $${commission.amount}`)
      // In production, this should trigger an alert to admin
    }

    console.log(`Commission ${commission.id} cancelled: ${reason}`)
  }
}

/**
 * Log commission status changes for audit trail
 */
async function logCommissionStatusChange(
  supabase: ReturnType<typeof createClient>,
  commissionId: string,
  previousStatus: string | null,
  newStatus: string,
  reason: string,
  metadata: Record<string, any> = {}
) {
  try {
    await (supabase as any)
      .from('commission_status_log')
      .insert({
        commission_id: commissionId,
        previous_status: previousStatus,
        new_status: newStatus,
        reason,
        metadata
      } as any)
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('Failed to log commission status change:', error)
  }
}

/**
 * Update KING MIDAS daily stats
 */
async function updateKingMidasStats(
  supabase: ReturnType<typeof createClient>,
  affiliateId: string,
  profit: number,
  date: string
) {
  // Get or create daily stats record
  const { data: existingStats } = await (supabase as any)
    .from('king_midas_daily_stats')
    .select('profit_generated')
    .eq('affiliate_id', affiliateId)
    .eq('date', date)
    .single() as { data: { profit_generated: number } | null }

  if (existingStats) {
    const currentProfit = parseFloat((existingStats.profit_generated as number)?.toString() || '0')
    await (supabase as any)
      .from('king_midas_daily_stats')
      .update({
        profit_generated: currentProfit + profit,
      } as any)
      .eq('affiliate_id', affiliateId)
      .eq('date', date)
  } else {
    await (supabase as any)
      .from('king_midas_daily_stats')
      .insert({
        affiliate_id: affiliateId,
        date,
        profit_generated: profit,
      } as any)
  }
}
