# Discord Integration Quick Reference

Quick reference for Discord API endpoints and usage.

## 🔗 API Endpoints

### Webhook (Send Messages)
```
POST /api/discord/webhook
Content-Type: application/json

{
  "content": "Hello!",
  "embeds": [{
    "title": "Title",
    "description": "Description",
    "color": 0x00ff00
  }]
}
```

### OAuth2 (User Authentication)
```
# Start OAuth flow
GET /api/discord/oauth

# Callback (handled automatically)
GET /api/discord/oauth/callback?code=...
```

### Interactions (Bot Commands)
```
POST /api/discord/interactions
X-Signature-Ed25519: ...
X-Signature-Timestamp: ...
Content-Type: application/json

{
  "type": 2,
  "data": {
    "name": "ping"
  }
}
```

## 📝 Environment Variables

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_GUILD_ID=your_server_id
```

## 🛠️ Utility Functions

```typescript
import {
  sendDiscordWebhook,
  sendDiscordMessage,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  createInfoEmbed,
  getDiscordOAuthUrl,
  getDiscordUser,
} from '@/lib/discord/utils'
```

## 📚 Full Documentation

See [DISCORD_SETUP.md](./DISCORD_SETUP.md) for complete setup instructions.
