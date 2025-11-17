/**
 * Vercel Deployment Webhook Handler
 * 
 * Receives deployment status updates from Vercel and sends alerts
 * 
 * Webhook events:
 * - deployment.created: New deployment started
 * - deployment.succeeded: Deployment succeeded
 * - deployment.error: Deployment failed
 * - deployment.ready: Deployment ready
 * - deployment.canceled: Deployment canceled
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendTelegramMessage } from '../services/telegram-handler'

interface VercelWebhookPayload {
  id: string
  type: 'deployment.created' | 'deployment.succeeded' | 'deployment.error' | 'deployment.ready' | 'deployment.canceled'
  createdAt: number
  payload: {
    deployment?: {
      id: string
      url: string
      name: string
      state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'QUEUED'
      meta?: {
        githubCommitAuthorName?: string
        githubCommitMessage?: string
        githubCommitRef?: string
        githubCommitSha?: string
        githubDeployment?: string
      }
      target?: 'production' | 'staging' | null
      projectId?: string
      project?: {
        id: string
        name: string
      }
    }
    error?: {
      code: string
      message: string
    }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature (if configured)
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers['x-vercel-signature'] as string
      if (!signature) {
        console.warn('Missing Vercel webhook signature')
        // Continue anyway - signature verification is optional
      }
      // TODO: Add signature verification when Vercel provides signature format
    }

    const event: VercelWebhookPayload = req.body
    const eventType = event.type

    console.log('Vercel webhook received:', eventType, {
      deploymentId: event.payload.deployment?.id,
      project: event.payload.deployment?.project?.name,
      state: event.payload.deployment?.state,
    })

    // Extract deployment info
    const deployment = event.payload.deployment
    const error = event.payload.error

    if (!deployment) {
      console.warn('No deployment info in webhook payload')
      return res.status(200).json({ received: true })
    }

    const deploymentId = deployment.id
    const projectName = deployment.project?.name || deployment.name || 'Unknown'
    const deploymentUrl = deployment.url || 'N/A'
    const state = deployment.state
    const target = deployment.target || 'unknown'
    const commitMessage = deployment.meta?.githubCommitMessage || 'No commit message'
    const commitAuthor = deployment.meta?.githubCommitAuthorName || 'Unknown'
    const commitRef = deployment.meta?.githubCommitRef || 'unknown'

    // Handle different event types
    switch (eventType) {
      case 'deployment.created':
        console.log(`🚀 Deployment ${deploymentId} started for ${projectName}`)
        await sendNotification(
          `🚀 *Deployment Started*\n\n` +
          `*Project:* ${projectName}\n` +
          `*Target:* ${target}\n` +
          `*Branch:* ${commitRef}\n` +
          `*Author:* ${commitAuthor}\n` +
          `*Commit:* ${commitMessage.substring(0, 50)}${commitMessage.length > 50 ? '...' : ''}\n\n` +
          `Deployment ID: \`${deploymentId}\``,
          false
        )
        break

      case 'deployment.succeeded':
      case 'deployment.ready':
        console.log(`✅ Deployment ${deploymentId} succeeded for ${projectName}`)
        await sendNotification(
          `✅ *Deployment Succeeded*\n\n` +
          `*Project:* ${projectName}\n` +
          `*URL:* ${deploymentUrl}\n` +
          `*Target:* ${target}\n` +
          `*Branch:* ${commitRef}\n\n` +
          `Deployment ID: \`${deploymentId}\``,
          false
        )
        break

      case 'deployment.error':
        const errorMessage = error?.message || 'Unknown error'
        const errorCode = error?.code || 'UNKNOWN'
        
        console.error(`❌ Deployment ${deploymentId} failed for ${projectName}:`, errorMessage)
        
        // Get build logs URL
        const logsUrl = `https://vercel.com/joshua-greenes-projects/${projectName}/${deploymentId}`
        
        await sendNotification(
          `❌ *Deployment Failed*\n\n` +
          `*Project:* ${projectName}\n` +
          `*Target:* ${target}\n` +
          `*Branch:* ${commitRef}\n` +
          `*Author:* ${commitAuthor}\n` +
          `*Error Code:* ${errorCode}\n` +
          `*Error:* ${errorMessage}\n\n` +
          `*View Logs:* ${logsUrl}\n\n` +
          `Deployment ID: \`${deploymentId}\``,
          true // Mark as error
        )
        break

      case 'deployment.canceled':
        console.log(`⚠️ Deployment ${deploymentId} canceled for ${projectName}`)
        await sendNotification(
          `⚠️ *Deployment Canceled*\n\n` +
          `*Project:* ${projectName}\n` +
          `*Target:* ${target}\n` +
          `*Branch:* ${commitRef}\n\n` +
          `Deployment ID: \`${deploymentId}\``,
          false
        )
        break

      default:
        console.log(`Unhandled Vercel webhook event type: ${eventType}`)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing Vercel webhook:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}

/**
 * Send notification via Telegram (if configured) or console
 */
async function sendNotification(message: string, isError: boolean): Promise<void> {
  // Try Telegram first (if configured)
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const allowedUserIds = process.env.TELEGRAM_ALLOWED_USER_IDS

  if (botToken && allowedUserIds) {
    try {
      const userIds = allowedUserIds.split(',').map(id => parseInt(id.trim()))
      
      // Send to all allowed users
      for (const userId of userIds) {
        await sendTelegramMessage(botToken, userId, message, 'Markdown')
      }
      
      console.log('✅ Notification sent via Telegram')
      return
    } catch (error) {
      console.error('Failed to send Telegram notification:', error)
      // Fall through to console logging
    }
  }

  // Fallback: Console logging (always happens)
  const prefix = isError ? '❌ [ERROR]' : 'ℹ️ [INFO]'
  console.log(`${prefix} ${message.replace(/\*/g, '').replace(/`/g, '')}`)
}

