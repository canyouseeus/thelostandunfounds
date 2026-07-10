import vercelWebhookHandler from '../lib/api-handlers/_vercel-webhook-handler.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel Deployment Webhook Endpoint
 *
 * Register this URL in Vercel Dashboard -> Project Settings -> Webhooks:
 *   https://thelostandunfounds.com/api/deploy-webhook
 * Events: deployment.succeeded, deployment.failed, deployment.error
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
    return vercelWebhookHandler(req, res)
}
