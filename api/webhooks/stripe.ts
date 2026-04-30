import stripeWebhookHandler from '../../lib/api-handlers/_stripe-webhook-handler.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Stripe Webhook Endpoint
 *
 * Receives POST webhooks from Stripe for events like checkout.session.completed.
 * Register this URL in your Stripe Dashboard webhook settings:
 *   https://www.thelostandunfounds.com/api/webhooks/stripe
 *
 * IMPORTANT: bodyParser is disabled below so the underlying handler can
 * verify the webhook signature against the raw request body.
 */
export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    return stripeWebhookHandler(req, res)
}
