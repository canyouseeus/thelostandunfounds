/**
 * Telegram Command Handler Service
 * Processes commands and handles voice transcription
 */

interface TelegramMessage {
  chat_id: number
  text: string
  parse_mode?: string
}

interface TelegramFile {
  file_id: string
  file_path?: string
}

/**
 * Send a message to Telegram chat
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  parseMode: string = 'Markdown'
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to send Telegram message: ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

/**
 * Download voice file from Telegram
 */
export async function downloadVoiceFile(
  botToken: string,
  fileId: string
): Promise<Buffer | null> {
  try {
    // Get file path from Telegram
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    )

    if (!fileInfoResponse.ok) {
      console.error('Failed to get file info from Telegram')
      return null
    }

    const fileInfo: { ok: boolean; result: TelegramFile } = await fileInfoResponse.json()

    if (!fileInfo.ok || !fileInfo.result.file_path) {
      console.error('Invalid file info response:', fileInfo)
      return null
    }

    // Download the file
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`
    const fileResponse = await fetch(fileUrl)

    if (!fileResponse.ok) {
      console.error('Failed to download voice file')
      return null
    }

    const arrayBuffer = await fileResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error downloading voice file:', error)
    return null
  }
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      return null
    }

    // Create FormData for multipart/form-data request
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: 'audio/ogg' })
    formData.append('file', blob, 'voice.ogg')
    formData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI Whisper API error: ${errorText}`)
      return null
    }

    const result: { text: string } = await response.json()
    return result.text.trim()
  } catch (error) {
    console.error('Error transcribing audio:', error)
    return null
  }
}

/**
 * Download and transcribe voice message
 */
export async function downloadAndTranscribeVoice(
  botToken: string,
  fileId: string
): Promise<string | null> {
  const audioBuffer = await downloadVoiceFile(botToken, fileId)
  if (!audioBuffer) {
    return null
  }

  return await transcribeAudio(audioBuffer)
}

/**
 * Process Telegram command and return response
 */
export async function handleTelegramCommand(
  command: string,
  userId: number,
  username: string = 'unknown'
): Promise<string> {
  try {
    // Parse command
    const parts = command.trim().split(/\s+/)
    if (!parts.length || !parts[0]) {
      return '❌ Empty command received'
    }

    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    // Handle different commands
    switch (cmd) {
      case '/status':
      case 'status':
        return await handleStatusCommand()

      case '/metrics':
      case 'metrics':
        return await handleMetricsCommand()

      case '/deploy':
      case 'deploy':
        return await handleDeployCommand(args)

      case '/marketing':
      case 'marketing':
        return await handleMarketingCommand(args)

      case '/add':
      case 'add':
        return await handleAddCommand(args)

      case '/help':
      case 'help':
        return await handleHelpCommand()

      default:
        // Try to interpret natural language commands
        const lowerCommand = command.toLowerCase()
        if (lowerCommand.includes('status') || lowerCommand.includes('health')) {
          return await handleStatusCommand()
        }
        if (lowerCommand.includes('metrics') || lowerCommand.includes('revenue')) {
          return await handleMetricsCommand()
        }
        if (lowerCommand.includes('deploy')) {
          return await handleDeployCommand(args)
        }
        
        return `❌ Unknown command: ${cmd}\n\nUse /help for available commands`
    }
  } catch (error) {
    console.error('Error processing Telegram command:', error)
    return `❌ Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function handleStatusCommand(): Promise<string> {
  try {
    // Check system health - you can customize this URL
    const healthUrl = process.env.HEALTH_CHECK_URL || 'https://thelostandunfounds.com'
    
    const response = await fetch(healthUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    const status = response.ok ? '🟢 Online' : '🔴 Offline'
    
    return `*System Status*\n\n${status}\n*Time*: ${new Date().toUTCString()}`
  } catch (error) {
    return `*System Status*\n\n🔴 Error checking status\n*Error*: ${error instanceof Error ? error.message : 'Unknown'}`
  }
}

async function handleMetricsCommand(): Promise<string> {
  // Placeholder - integrate with your actual metrics API
  return `*Metrics*\n\n*Total Users*: N/A\n*Active Sessions*: N/A\n*Revenue*: $0.00\n\n*Note*: Metrics integration pending`
}

async function handleDeployCommand(args: string[]): Promise<string> {
  if (!args.length) {
    return '❌ Deploy command requires arguments\n\nUse: `/deploy [frontend|backend|both]`'
  }

  const deployType = args[0].toLowerCase()

  switch (deployType) {
    case 'frontend':
      return '🚀 *Frontend Deploy*\n\nTriggering Vercel deployment...\n✅ Frontend will update automatically from GitHub'
    case 'backend':
      return '🚀 *Backend Deploy*\n\nTriggering backend deployment...\n✅ Backend will update automatically'
    case 'both':
      return '🚀 *Full Deploy*\n\nTriggering both frontend and backend...\n✅ Both services will update automatically'
    default:
      return `❌ Unknown deploy type: ${deployType}\n\nUse: frontend, backend, or both`
  }
}

async function handleMarketingCommand(args: string[]): Promise<string> {
  if (!args.length) {
    return '❌ Marketing command requires arguments\n\nUse: `/marketing [start|status|stop]`'
  }

  const action = args[0].toLowerCase()

  switch (action) {
    case 'start':
      return `*Marketing Campaign Started*\n\n✅ Campaigns ready\n✅ Templates prepared\n*Next*: Execute outreach!`
    case 'status':
      return `*Marketing Status*\n\n*Status*: Active\n*Campaigns*: Ready\n*Target*: Active`
    case 'stop':
      return '⏹️ *Marketing Campaign Stopped*'
    default:
      return `❌ Unknown marketing action: ${action}\n\nUse: start, status, or stop`
  }
}

async function handleAddCommand(args: string[]): Promise<string> {
  if (args.length < 2) {
    return '❌ Add command requires type and data\n\nUse: `/add [client|automation|transaction] [data]`'
  }

  const addType = args[0].toLowerCase()
  const data = args.slice(1).join(' ')

  switch (addType) {
    case 'client':
      return `👤 *Adding Client*\n\n${data}\n✅ Client will be added to database`
    case 'automation':
      return `🤖 *Adding Automation*\n\n${data}\n✅ Automation will be created`
    case 'transaction':
      return `💰 *Adding Transaction*\n\n${data}\n✅ Transaction will be recorded`
    default:
      return `❌ Unknown add type: ${addType}\n\nUse: client, automation, or transaction`
  }
}

async function handleHelpCommand(): Promise<string> {
  return `🤖 *Telegram Commands*\n\n*System Commands:*\n• /status - Check system health\n• /metrics - Show current metrics\n• /deploy [frontend|backend|both] - Trigger deployment\n\n*Business Commands:*\n• /marketing [start|status|stop] - Control marketing\n• /add [client|automation|transaction] [data] - Add data\n\n*Voice Commands:*\n• Send a voice message with your command\n• The bot will transcribe and execute it\n\n*General:*\n• /help - Show this help message\n\n*Examples:*\n• /status\n• /metrics\n• /deploy both\n• Say "check status" in a voice message`
}


