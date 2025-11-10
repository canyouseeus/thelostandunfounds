# Telegram Voice Commands Integration

This guide explains how to set up Telegram voice commands for remote control of your application.

## 🎯 Overview

The Telegram integration allows you to:
- Send voice commands remotely via Telegram
- Receive system status updates
- Control deployments and marketing campaigns
- Check metrics and system health

## 📋 Prerequisites

1. **Telegram Bot Token**
   - Create a bot via [@BotFather](https://t.me/botfather) on Telegram
   - Get your bot token

2. **OpenAI API Key** (for voice transcription)
   - Sign up at [OpenAI](https://platform.openai.com)
   - Get your API key from the dashboard

3. **Vercel Deployment**
   - Your app should be deployed on Vercel
   - You'll need the webhook URL

## 🚀 Setup Steps

### Step 1: Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to name your bot
4. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Configure Environment Variables

Add these to your Vercel project environment variables:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional: Restrict bot to specific users (comma-separated user IDs)
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321

# OpenAI API Key for voice transcription
OPENAI_API_KEY=sk-your_openai_api_key_here

# Optional: Health check URL
HEALTH_CHECK_URL=https://thelostandunfounds.com
```

**To add environment variables in Vercel:**
1. Go to your project dashboard
2. Settings → Environment Variables
3. Add each variable for Production, Preview, and Development

### Step 3: Set Up Webhook

After deploying, set the webhook URL:

```bash
# Replace YOUR_BOT_TOKEN and YOUR_DOMAIN
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN.vercel.app/api/telegram/webhook",
    "allowed_updates": ["message"]
  }'
```

Or use the webhook info endpoint to verify:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### Step 4: Test the Bot

1. Find your bot on Telegram (search for the username you created)
2. Send `/start` or `/help` to see available commands
3. Try sending a voice message with a command like "check status"

## 📱 Available Commands

### Text Commands

- `/status` - Check system health
- `/metrics` - Show current metrics
- `/deploy [frontend|backend|both]` - Trigger deployment
- `/marketing [start|status|stop]` - Control marketing campaigns
- `/add [client|automation|transaction] [data]` - Add new data
- `/help` - Show help message

### Voice Commands

Simply send a voice message with your command:
- "check status"
- "what are the metrics?"
- "deploy frontend"
- "start marketing campaign"

The bot will:
1. Transcribe your voice message using OpenAI Whisper
2. Process the command
3. Send back the response

## 🔒 Security

### User Restrictions

To restrict bot access to specific users:

1. Get your Telegram user ID:
   - Send a message to [@userinfobot](https://t.me/userinfobot)
   - Copy your user ID

2. Set `TELEGRAM_ALLOWED_USER_IDS` environment variable:
   ```bash
   TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
   ```

### Webhook Security

The webhook endpoint validates:
- Only POST requests are accepted
- User ID restrictions (if configured)
- Proper Telegram message format

## 🛠️ Troubleshooting

### Bot Not Responding

1. **Check webhook status:**
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
   ```

2. **Verify environment variables:**
   - Check Vercel dashboard → Settings → Environment Variables
   - Ensure all required variables are set

3. **Check Vercel function logs:**
   - Go to Vercel dashboard → Your Project → Functions
   - Check `/api/telegram/webhook` logs

### Voice Transcription Not Working

1. **Verify OpenAI API Key:**
   - Check that `OPENAI_API_KEY` is set correctly
   - Ensure you have credits in your OpenAI account

2. **Check audio format:**
   - Telegram sends OGG Opus format
   - OpenAI Whisper supports this format

### Commands Not Recognized

- Commands are case-insensitive
- Natural language is supported (e.g., "check status" works)
- Use `/help` to see all available commands

## 📊 API Endpoints

### Webhook Endpoint
- **URL:** `/api/telegram/webhook`
- **Method:** POST
- **Description:** Receives Telegram webhook updates

### Status Endpoint (for testing)
You can test commands programmatically:

```typescript
// Example: Test command handler
import { handleTelegramCommand } from './api/services/telegram-handler'

const response = await handleTelegramCommand('/status', 123456789, 'testuser')
console.log(response)
```

## 🔄 Integration with Existing Services

The Telegram handler can be extended to integrate with:

- **Supabase** - Check user subscriptions, store command history
- **MCP Registry** - Execute tools via voice commands
- **Vercel API** - Trigger deployments
- **Railway API** - Manage backend services

## 📝 Example Usage

### Example 1: Check Status
```
You: /status
Bot: 🟢 System Status
     Online
     Time: 2025-01-13 12:00:00 UTC
```

### Example 2: Voice Command
```
You: [Voice message: "check metrics"]
Bot: 🎤 Voice Command: check metrics
     
     📊 Metrics
     Total Users: 150
     Active Sessions: 25
     Revenue: $1,234.56
```

### Example 3: Deploy Command
```
You: /deploy frontend
Bot: 🚀 Frontend Deploy
     Triggering Vercel deployment...
     ✅ Frontend will update automatically from GitHub
```

## 🎉 Next Steps

1. **Customize Commands:** Edit `api/services/telegram-handler.ts` to add your own commands
2. **Integrate with Services:** Connect commands to your actual APIs and services
3. **Add Authentication:** Link Telegram user IDs to your application users
4. **Store History:** Save command history to Supabase for analytics

## 📚 Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

