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
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature (if Fourthwall provides one)
    // TODO: Add signature verification when Fourthwall webhook secret is available
    const webhookSecret = process.env.FOURTHWALL_WEBHOOK_SECRET
    if (webhookSecret) {
      // Verify signature here
      // const signature = req.headers['x-fourthwall-signature']
      // if (!verifySignature(req.body, signature, webhookSecret)) {
      //   return res.status(401).json({ error: 'Invalid signature' })
      // }
    }

    const event = req.body
    const eventType = event.type || event.event_type

    console.log('Fourthwall webhook received:', eventType, event)

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle different event types
    // Fourthwall may send "order.updated" for all order events
    switch (eventType) {
      case 'order.created':
      case 'order.fulfilled':
      case 'order.updated':
        await handleOrderCreated(supabase as any, event)
        break

      case 'order.cancelled':
        await handleOrderCancelled(supabase as any, event)
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
  const order = event.data || event.order || event
  const orderId = (order.id || order.order_id || '') as string
  
  // Check order status - only process completed/fulfilled orders
  const orderStatus = order.status || order.order_status
  if (orderStatus === 'cancelled' || orderStatus === 'refunded') {
    await handleOrderCancelled(supabase, event)
    return
  }
  
  // Skip if order is not completed/fulfilled
  if (orderStatus !== 'fulfilled' && orderStatus !== 'completed' && orderStatus !== 'paid') {
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

  // Calculate commission from order items
  const lineItems = order.line_items || order.items || []
  let totalCommission = 0
  let totalProfit = 0

  for (const item of lineItems) {
    const productId = item.product_id || item.product?.id
    const variantId = item.variant_id || item.variant?.id
    const quantity = item.quantity || 1
    const price = parseFloat(item.price || item.unit_price || 0)

    // Get product cost
    const { data: productCost } = await (supabase as any)
      .from('product_costs')
      .select('cost')
      .eq('product_id', productId)
      .eq('variant_id', variantId || '')
      .eq('source', 'fourthwall')
      .single() as { data: { cost: number } | null }

    const cost = productCost ? (productCost.cost as number) : 0
    const profit = (price - cost) * quantity
    totalProfit += profit

    // Calculate commission (10% of profit or commission_rate)
    const commission = profit * commissionRate
    totalCommission += commission
  }

  if (totalCommission <= 0) {
    console.log('No commission to record for order:', orderId)
    return
  }

  // Create commission record
  const { error: commissionError } = await (supabase as any)
    .from('affiliate_commissions')
    .insert({
      affiliate_id: affiliateId,
      order_id: orderId,
      amount: totalCommission,
      profit_generated: totalProfit,
      source: 'fourthwall',
      product_cost: totalProfit > 0 ? (totalProfit - totalCommission / commissionRate) : 0,
      status: 'pending',
    } as any)

  if (commissionError) {
    console.error('Error creating commission:', commissionError)
    throw commissionError
  }

  // Update affiliate total earnings
  // Get current values first, then update
  const { data: currentAffiliate } = await (supabase as any)
    .from('affiliates')
    .select('total_earnings, total_conversions')
    .eq('id', affiliateId)
    .single() as { data: { total_earnings: number; total_conversions: number } | null }

  if (currentAffiliate) {
    await (supabase as any)
      .from('affiliates')
      .update({
        total_earnings: ((currentAffiliate.total_earnings as number) || 0) + totalCommission,
        total_conversions: ((currentAffiliate.total_conversions as number) || 0) + 1,
      } as any)
      .eq('id', affiliateId)
  }

  // Update KING MIDAS daily stats
  const today = new Date().toISOString().split('T')[0]
  await updateKingMidasStats(supabase as any, affiliateId, totalProfit, today)

  console.log(`Commission created: ${totalCommission} for affiliate ${affiliateRef} from order ${orderId}`)
}

/**
 * Handle order cancelled event
 */
async function handleOrderCancelled(
  supabase: ReturnType<typeof createClient>,
  event: any
) {
  const order = event.data || event.order || event
  const orderId = (order.id || order.order_id || '') as string

  // Cancel associated commissions
  const { error } = await (supabase as any)
    .from('affiliate_commissions')
    .update({ status: 'cancelled' } as any)
    .eq('order_id', orderId)
    .eq('source', 'fourthwall')

  if (error) {
    console.error('Error cancelling commissions:', error)
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
    // Update existing record - get current value first
    const currentProfit = parseFloat((existingStats.profit_generated as number)?.toString() || '0')
    await (supabase as any)
      .from('king_midas_daily_stats')
      .update({
        profit_generated: currentProfit + profit,
      } as any)
      .eq('affiliate_id', affiliateId)
      .eq('date', date)
  } else {
    // Create new record
    await (supabase as any)
      .from('king_midas_daily_stats')
      .insert({
        affiliate_id: affiliateId,
        date,
        profit_generated: profit,
      } as any)
  }
}

