# Discord Integration Testing Guide

After setting environment variables and redeploying, test your Discord integration.

## ✅ Verification Checklist

### 1. Check Environment Variables Are Set

Verify these are set in Vercel:
- ✅ `DISCORD_BOT_TOKEN`
- ✅ `DISCORD_CLIENT_ID` (`1428346383772942346`)
- ✅ `DISCORD_CLIENT_SECRET`
- ✅ `DISCORD_PUBLIC_KEY`
- ✅ `DISCORD_GUILD_ID` (`833383219083608084`)
- ⚠️ `DISCORD_WEBHOOK_URL` (optional)

### 2. Test Webhook Endpoint

**Health Check:**
```bash
curl https://thelostandunfounds.com/api/discord/webhook
```

Expected response:
```json
{
  "message": "Discord webhook endpoint is active",
  "methods": ["POST"],
  "webhookConfigured": true
}
```

**Send Test Message:**
```bash
curl -X POST https://thelostandunfounds.com/api/discord/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message from THE LOST+UNFOUNDS!",
    "embeds": [{
      "title": "Test Notification",
      "description": "Discord integration is working!",
      "color": 0x00ff00
    }]
  }'
```

**Note:** This requires `DISCORD_WEBHOOK_URL` to be set. If not set, you'll get an error.

### 3. Test Interactions Endpoint

**Health Check:**
```bash
curl https://thelostandunfounds.com/api/discord/interactions
```

Expected response:
```json
{
  "message": "Discord interactions endpoint is active",
  "methods": ["POST"]
}
```

**Ping Test (Discord Verification):**
```bash
curl -X POST https://thelostandunfounds.com/api/discord/interactions \
  -H "Content-Type: application/json" \
  -H "X-Signature-Ed25519: test" \
  -H "X-Signature-Timestamp: test" \
  -d '{"type": 1}'
```

Expected response (for ping):
```json
{"type": 1}
```

### 4. Test OAuth Endpoint

**Start OAuth Flow:**
Open in browser:
```
https://thelostandunfounds.com/api/discord/oauth
```

This should redirect you to Discord's authorization page.

### 5. Register Slash Commands

**Local Testing:**
```bash
# Make sure you have .env.local with your Discord credentials
npm run discord:register-commands
```

**Or use Vercel CLI:**
```bash
# Set environment variables locally
export DISCORD_BOT_TOKEN=your_token
export DISCORD_CLIENT_ID=1428346383772942346
export DISCORD_GUILD_ID=833383219083608084

# Run the script
npx tsx scripts/register-discord-commands.ts
```

Expected output:
```
Registering commands for guild: 833383219083608084
✅ Commands registered successfully!
Registered commands:
  - /ping: Check if the bot is online
  - /info: Get information about THE LOST+UNFOUNDS
  - /blog: Get information about blog posts
```

### 6. Test Bot Commands in Discord

After registering commands:

1. Go to your Discord server
2. Type `/` in a channel
3. You should see your bot's commands:
   - `/ping`
   - `/info`
   - `/blog`
4. Try `/ping` - should respond with "Pong! 🏓"

## 🔧 Troubleshooting

### Webhook Returns 500 Error

**Check:**
- Is `DISCORD_WEBHOOK_URL` set in Vercel?
- Is the webhook URL valid?
- Test the webhook URL directly:
  ```bash
  curl -X POST "YOUR_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"content": "Test"}'
  ```

### Interactions Return 401 Error

**Check:**
- Is `DISCORD_PUBLIC_KEY` set correctly?
- The signature verification requires proper Ed25519 verification
- Install `@noble/ed25519` for production:
  ```bash
  npm install @noble/ed25519
  ```

### Commands Not Appearing in Discord

**Check:**
- Is the bot in your server?
- Did you run `npm run discord:register-commands`?
- Check bot permissions in server settings
- Commands may take a few minutes to appear

### OAuth Redirect Not Working

**Check:**
- Is the redirect URL added in Discord Developer Portal?
- URLs must match exactly (including protocol)
- Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set

## 📊 Expected API Responses

### Webhook Success
```json
{
  "success": true,
  "message": "Message sent to Discord",
  "discordResponse": {
    "id": "...",
    "type": 0,
    "content": "Test message"
  }
}
```

### Interactions Success (Ping)
```json
{"type": 1}
```

### Interactions Success (Command)
```json
{
  "type": 4,
  "data": {
    "content": "Pong! 🏓"
  }
}
```

## 🎯 Next Steps

After successful testing:
1. ✅ Webhook endpoint working
2. ✅ Interactions endpoint responding
3. ✅ OAuth flow redirecting
4. ✅ Commands registered
5. ✅ Bot responding in Discord

You're ready to use Discord integration!

## 📚 Related

- [Discord Setup Guide](./DISCORD_SETUP.md)
- [Discord Quick Reference](./DISCORD_QUICK_REFERENCE.md)
