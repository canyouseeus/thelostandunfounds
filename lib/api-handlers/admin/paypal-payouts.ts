/**
 * PayPal Payouts API Service
 * 
 * Handles automated payouts to affiliates via PayPal Payouts API
 * https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// PayPal API base URLs
const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com'
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com'

interface PayoutItem {
  requestId: string
  affiliateCode: string
  amount: number
  currency: string
  paypalEmail: string
  note?: string
}

interface PayoutBatchResponse {
  batch_header: {
    payout_batch_id: string
    batch_status: string
    sender_batch_header: {
      sender_batch_id: string
    }
  }
  links: Array<{ href: string; rel: string }>
}

interface PayoutStatusResponse {
  batch_header: {
    payout_batch_id: string
    batch_status: string
    time_completed?: string
    amount: {
      currency: string
      value: string
    }
    fees: {
      currency: string
      value: string
    }
  }
  items: Array<{
    payout_item_id: string
    transaction_status: string
    payout_item: {
      recipient_type: string
      amount: { currency: string; value: string }
      receiver: string
      sender_item_id: string
    }
    errors?: {
      name: string
      message: string
    }
  }>
}

/**
 * Get PayPal configuration
 */
function getPayPalConfig() {
  const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase()
  const isSandbox = environment !== 'LIVE'
  
  const clientId = isSandbox
    ? process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID
    : process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID_LIVE
  
  const clientSecret = isSandbox
    ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET
    : process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET_LIVE
  
  const baseUrl = isSandbox ? PAYPAL_SANDBOX_URL : PAYPAL_LIVE_URL
  
  return { clientId, clientSecret, baseUrl, isSandbox }
}

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseUrl } = getPayPalConfig()
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get PayPal access token: ${error}`)
  }
  
  const data = await response.json()
  return data.access_token
}

/**
 * Create a batch payout to multiple recipients
 */
export async function createPayoutBatch(
  items: PayoutItem[],
  senderBatchId?: string
): Promise<PayoutBatchResponse> {
  const { baseUrl, isSandbox } = getPayPalConfig()
  const accessToken = await getAccessToken()
  
  // Generate unique batch ID if not provided
  const batchId = senderBatchId || `PAYOUT_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  // Build payout items
  const payoutItems = items.map((item, index) => ({
    recipient_type: 'EMAIL',
    amount: {
      value: item.amount.toFixed(2),
      currency: item.currency || 'USD',
    },
    receiver: item.paypalEmail,
    note: item.note || `Affiliate commission payout - ${item.affiliateCode}`,
    sender_item_id: item.requestId || `ITEM_${index}_${Date.now()}`,
  }))
  
  const payload = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: 'You have received a commission payout from THE LOST+UNFOUNDS',
      email_message: 'Thank you for being part of our affiliate program! Your commission has been paid.',
    },
    items: payoutItems,
  }
  
  console.log(`Creating PayPal payout batch (${isSandbox ? 'SANDBOX' : 'LIVE'}):`, {
    batchId,
    itemCount: items.length,
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
  })
  
  const response = await fetch(`${baseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  
  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('PayPal Payouts API error:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })
    throw new Error(`PayPal Payouts API error: ${response.status} - ${responseText}`)
  }
  
  const result = JSON.parse(responseText) as PayoutBatchResponse
  console.log('PayPal payout batch created:', result.batch_header)
  
  return result
}

/**
 * Get payout batch status
 */
export async function getPayoutBatchStatus(batchId: string): Promise<PayoutStatusResponse> {
  const { baseUrl } = getPayPalConfig()
  const accessToken = await getAccessToken()
  
  const response = await fetch(`${baseUrl}/v1/payments/payouts/${batchId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get payout status: ${error}`)
  }
  
  return response.json()
}

/**
 * Get individual payout item status
 */
export async function getPayoutItemStatus(itemId: string): Promise<any> {
  const { baseUrl } = getPayPalConfig()
  const accessToken = await getAccessToken()
  
  const response = await fetch(`${baseUrl}/v1/payments/payouts-item/${itemId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get payout item status: ${error}`)
  }
  
  return response.json()
}

/**
 * Check if PayPal Payouts is enabled and configured
 */
export function isPayoutsEnabled(): boolean {
  const { clientId, clientSecret } = getPayPalConfig()
  const enabled = process.env.PAYPAL_PAYOUTS_ENABLED === 'true'
  return enabled && !!clientId && !!clientSecret
}

/**
 * API Handler for PayPal Payouts operations
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const action = req.query.action as string
  
  try {
    switch (action) {
      case 'status':
        // Check if payouts is enabled with debug info
        const { clientId, clientSecret, isSandbox } = getPayPalConfig()
        const payoutsEnabledVar = process.env.PAYPAL_PAYOUTS_ENABLED
        return res.status(200).json({
          enabled: isPayoutsEnabled(),
          environment: process.env.PAYPAL_ENVIRONMENT || 'SANDBOX',
          debug: {
            payoutsEnabledVar: payoutsEnabledVar === 'true' ? 'set' : `missing or wrong (got: ${payoutsEnabledVar})`,
            clientIdSet: !!clientId ? 'set' : 'missing',
            clientSecretSet: !!clientSecret ? 'set' : 'missing',
            isSandbox,
          }
        })
      
      case 'batch-status':
        // Get batch payout status
        const batchId = req.query.batchId as string
        if (!batchId) {
          return res.status(400).json({ error: 'batchId is required' })
        }
        const batchStatus = await getPayoutBatchStatus(batchId)
        return res.status(200).json(batchStatus)
      
      case 'item-status':
        // Get individual payout item status
        const itemId = req.query.itemId as string
        if (!itemId) {
          return res.status(400).json({ error: 'itemId is required' })
        }
        const itemStatus = await getPayoutItemStatus(itemId)
        return res.status(200).json(itemStatus)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('PayPal Payouts handler error:', error)
    return res.status(500).json({
      error: 'PayPal Payouts operation failed',
      message: error?.message || 'Unknown error',
    })
  }
}
