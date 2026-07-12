import type { VercelRequest, VercelResponse } from '@vercel/node'
import prodigiWebhookHandler from '../../lib/api-handlers/_prodigi-webhook-handler.js'

/**
 * POST /api/prodigi/webhook
 * Receives Prodigi order status/shipping webhooks. Registered as the
 * callbackUrl on every order created via createProdigiOrder.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    return prodigiWebhookHandler(req, res)
}
