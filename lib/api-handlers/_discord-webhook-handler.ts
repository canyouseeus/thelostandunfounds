import { VercelRequest, VercelResponse } from '@vercel/node'
import { sendDiscordWebhook, DiscordWebhookPayload } from '../discord/utils'

/**
 * Discord Webhook Handler
 * 
 * Sends messages to Discord channels via webhook
 * 
 * POST /api/discord/webhook
 * Body: { content?: string, embeds?: DiscordEmbed[], ... }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow GET for health checks
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Discord webhook endpoint is active',
      methods: ['POST'],
      webhookConfigured: !!process.env.DISCORD_WEBHOOK_URL,
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL

    if (!webhookUrl) {
      return res.status(500).json({
        error: 'Discord webhook URL not configured',
        message: 'Set DISCORD_WEBHOOK_URL environment variable',
      })
    }

    // Validate payload
    const payload: DiscordWebhookPayload = req.body

    if (!payload.content && !payload.embeds) {
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Must provide either content or embeds',
      })
    }

    // Send to Discord
    const response = await sendDiscordWebhook(webhookUrl, payload)
    const responseData = await response.json()

    return res.status(200).json({
      success: true,
      message: 'Message sent to Discord',
      discordResponse: responseData,
    })
  } catch (error: any) {
    console.error('Error sending Discord webhook:', error)
    return res.status(500).json({
      error: 'Failed to send Discord webhook',
      message: error.message,
    })
  }
}
