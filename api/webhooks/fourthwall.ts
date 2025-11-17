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
        await handleOrderCreated(supabase, event)
        break

      case 'order.cancelled':
        await handleOrderCancelled(supabase, event)
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
  const orderId = order.id || order.order_id
  
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
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliates')
    .select('id, commission_rate')
    .eq('code', affiliateRef)
    .eq('status', 'active')
    .single()

  if (affiliateError || !affiliate) {
    console.warn(`Affiliate not found: ${affiliateRef}`, affiliateError)
    return
  }

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
    const { data: productCost } = await supabase
      .from('product_costs')
      .select('cost')
      .eq('product_id', productId)
      .eq('variant_id', variantId || '')
      .eq('source', 'fourthwall')
      .single()

    const cost = productCost?.cost || 0
    const profit = (price - cost) * quantity
    totalProfit += profit

    // Calculate commission (10% of profit or commission_rate)
    const commissionRate = affiliate.commission_rate / 100
    const commission = profit * commissionRate
    totalCommission += commission
  }

  if (totalCommission <= 0) {
    console.log('No commission to record for order:', orderId)
    return
  }

  // Create commission record
  const { error: commissionError } = await supabase
    .from('affiliate_commissions')
    .insert({
      affiliate_id: affiliate.id,
      order_id: orderId,
      amount: totalCommission,
      profit_generated: totalProfit,
      source: 'fourthwall',
      product_cost: totalProfit > 0 ? (totalProfit - totalCommission / (affiliate.commission_rate / 100)) : 0,
      status: 'pending',
    })

  if (commissionError) {
    console.error('Error creating commission:', commissionError)
    throw commissionError
  }

  // Update affiliate total earnings
  await supabase
    .from('affiliates')
    .update({
      total_earnings: supabase.raw(`total_earnings + ${totalCommission}`),
      total_conversions: supabase.raw('total_conversions + 1'),
    })
    .eq('id', affiliate.id)

  // Update KING MIDAS daily stats
  const today = new Date().toISOString().split('T')[0]
  await updateKingMidasStats(supabase, affiliate.id, totalProfit, today)

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
  const orderId = order.id || order.order_id

  // Cancel associated commissions
  const { error } = await supabase
    .from('affiliate_commissions')
    .update({ status: 'cancelled' })
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
  const { data: existingStats } = await supabase
    .from('king_midas_daily_stats')
    .select('profit_generated')
    .eq('affiliate_id', affiliateId)
    .eq('date', date)
    .single()

  if (existingStats) {
    // Update existing record
    await supabase
      .from('king_midas_daily_stats')
      .update({
        profit_generated: supabase.raw(`profit_generated + ${profit}`),
      })
      .eq('affiliate_id', affiliateId)
      .eq('date', date)
  } else {
    // Create new record
    await supabase
      .from('king_midas_daily_stats')
      .insert({
        affiliate_id: affiliateId,
        date,
        profit_generated: profit,
      })
  }
}

