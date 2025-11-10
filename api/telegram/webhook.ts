/**
 * Telegram Webhook Handler for Voice Commands
 * Handles Telegram webhook events and processes voice/text commands
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleTelegramCommand, sendTelegramMessage, downloadAndTranscribeVoice } from '../services/telegram-handler'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const update = req.body

    // Telegram sends updates in this format
    if (!update.message) {
      return res.status(200).json({ ok: true }) // Ignore non-message updates
    }

    const message = update.message
    const chat = message.chat || {}
    const user = message.from || {}
    const chatId = chat.id
    const userId = user.id
    const username = user.username || user.first_name || 'unknown'

    // Check if bot token is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return res.status(500).json({ error: 'Telegram bot not configured' })
    }

    // Check if user is allowed (if restrictions are set)
    const allowedUserIds = process.env.TELEGRAM_ALLOWED_USER_IDS
    if (allowedUserIds) {
      const allowedIds = allowedUserIds.split(',').map(id => parseInt(id.trim()))
      if (!allowedIds.includes(userId)) {
        console.warn(`Unauthorized user attempted to use bot: ${userId}`)
        return res.status(200).json({ ok: true }) // Silently ignore unauthorized users
      }
    }

    // Handle text messages (commands)
    if (message.text) {
      const text = message.text

      // Process command
      const responseText = await handleTelegramCommand(text, userId, username)

      // Send response back to Telegram
      await sendTelegramMessage(botToken, chatId, responseText)

      return res.status(200).json({ ok: true })
    }

    // Handle voice messages
    if (message.voice) {
      const voice = message.voice
      const fileId = voice.file_id
      const duration = voice.duration || 0

      // Send processing message
      await sendTelegramMessage(
        botToken,
        chatId,
        `🎤 *Processing voice message* (${duration}s)...\nPlease wait while I transcribe it.`
      )

      // Download and transcribe voice
      const transcription = await downloadAndTranscribeVoice(botToken, fileId)

      if (transcription) {
        // Process the transcribed command
        const responseText = await handleTelegramCommand(
          transcription,
          userId,
          username
        )

        // Send response with transcription
        const fullResponse = `🎤 *Voice Command*: ${transcription}\n\n${responseText}`
        await sendTelegramMessage(botToken, chatId, fullResponse)
      } else {
        await sendTelegramMessage(
          botToken,
          chatId,
          '❌ Could not transcribe voice message. Please try again or send a text command.'
        )
      }

      return res.status(200).json({ ok: true })
    }

    // Handle other message types (photos, documents, etc.)
    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    
    // Try to send error message to user if possible
    try {
      if (req.body?.message?.chat?.id) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (botToken) {
          await sendTelegramMessage(
            botToken,
            req.body.message.chat.id,
            `❌ Error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    } catch (sendError) {
      console.error('Failed to send error message:', sendError)
    }

    // Always return ok to Telegram to avoid retries for unexpected errors
    return res.status(200).json({ ok: true })
  }
}

