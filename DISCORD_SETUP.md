# Discord Server Integration Setup Guide

This guide explains how to set up Discord integration for THE LOST+UNFOUNDS, including bot setup, OAuth2 authentication, and webhook notifications.

## 🎯 Overview

Discord integration provides:
- **Bot Commands** - Interactive bot commands in your Discord server
- **OAuth2 Authentication** - Allow users to sign in with Discord
- **Webhook Notifications** - Send notifications to Discord channels
- **Server Management** - Manage server settings and members

## 🚀 Quick Setup

### Step 1: Create Discord Application

1. **Go to Discord Developer Portal**
   - Link: https://discord.com/developers/applications
   - Click **"New Application"**
   - Name it: `THE LOST+UNFOUNDS` (or your preferred name)
   - Click **"Create"**

2. **Get Application Credentials**
   - Go to **"General Information"** tab
   - Copy these values (you'll need them later):
     - **Application ID** → `DISCORD_CLIENT_ID`
     - **Public Key** → `DISCORD_PUBLIC_KEY`

### Step 2: Create Discord Bot

1. **Go to Bot Tab**
   - In your application, click **"Bot"** in the left sidebar
   - Click **"Add Bot"** → **"Yes, do it!"**

2. **Configure Bot Settings**
   - **Username**: Set your bot's display name
   - **Icon**: Upload a bot icon (optional)
   - **Public Bot**: Toggle OFF (unless you want it in bot lists)
   - **Requires OAuth2 Code Grant**: Toggle OFF (unless needed)
   - **Message Content Intent**: Toggle ON (if bot needs to read messages)
   - **Server Members Intent**: Toggle ON (if bot needs member info)
   - **Presence Intent**: Toggle ON (if bot needs presence info)

3. **Get Bot Token**
   - Click **"Reset Token"** → **"Yes, do it!"**
   - Copy the token → `DISCORD_BOT_TOKEN` (⚠️ Keep this secret!)
   - **Important**: Never commit this token to git!

### Step 3: Set Up OAuth2 (Optional - for User Authentication)

1. **Go to OAuth2 Tab**
   - In your application, click **"OAuth2"** → **"General"**

2. **Configure Redirect URLs**
   - Click **"Add Redirect"**
   - Add: `https://thelostandunfounds.com/api/discord/oauth/callback`
   - Add (for local dev): `http://localhost:5173/api/discord/oauth/callback`
   - Click **"Save Changes"**

3. **Get OAuth2 Credentials**
   - **Client ID**: Already copied (same as Application ID)
   - **Client Secret**: Click **"Reset Secret"** → Copy → `DISCORD_CLIENT_SECRET`
   - **Scopes**: Select these scopes:
     - `identify` - Get user's basic info
     - `email` - Get user's email
     - `guilds` - Get user's servers (optional)
     - `guilds.join` - Join user to server (optional)

### Step 4: Invite Bot to Your Server

1. **Go to OAuth2 → URL Generator**
   - Select **Scopes**: `bot`, `applications.commands`
   - Select **Bot Permissions**:
     - ✅ Send Messages
     - ✅ Embed Links
     - ✅ Read Message History
     - ✅ Use Slash Commands
     - ✅ Manage Webhooks (if using webhooks)
     - ✅ Manage Channels (if needed)
     - ✅ View Channels

2. **Copy Generated URL**
   - Copy the URL at the bottom
   - Open it in your browser
   - Select your Discord server
   - Click **"Authorize"**

### Step 5: Set Up Webhook (Optional - for Channel Notifications)

1. **In Your Discord Server**
   - Go to the channel where you want notifications
   - Click **"Edit Channel"** → **"Integrations"** → **"Webhooks"**
   - Click **"New Webhook"**
   - Name it: `THE LOST+UNFOUNDS Notifications`
   - Copy the **Webhook URL** → `DISCORD_WEBHOOK_URL`
   - Click **"Save"**

### Step 6: Configure Environment Variables

Add these to your Vercel environment variables:

1. **Go to Vercel Dashboard**
   - Link: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

2. **Add Required Variables**
   ```env
   # Discord Bot Configuration
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_application_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   DISCORD_PUBLIC_KEY=your_public_key_here
   
   # Discord Webhook (Optional)
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   
   # Discord Server ID (Optional - for server-specific features)
   DISCORD_GUILD_ID=your_server_id_here
   ```

3. **Set for All Environments**
   - Select: Production, Preview, Development
   - Click **"Save"**

4. **Add to Local Development**
   - Add the same variables to `.env.local` file
   - **Never commit** `.env.local` to git!

## 📋 API Endpoints

### Discord OAuth2 Authentication

**Start OAuth Flow**
```
GET /api/discord/oauth
```
Redirects user to Discord authorization page.

**OAuth Callback**
```
GET /api/discord/oauth/callback?code=...
```
Handles Discord OAuth callback and creates session.

### Discord Webhook

**Send Message to Discord**
```
POST /api/discord/webhook
Content-Type: application/json

{
  "content": "Hello from THE LOST+UNFOUNDS!",
  "embeds": [{
    "title": "Notification",
    "description": "This is a test notification",
    "color": 0x00ff00
  }]
}
```

### Discord Bot Commands (via Discord API)

Bot commands are registered with Discord and handled via interactions endpoint:

**Interaction Endpoint**
```
POST /api/discord/interactions
```
Handles Discord slash commands and interactions.

## 🔧 Usage Examples

### Send Notification to Discord Channel

```typescript
// In your API route or server function
const response = await fetch('https://thelostandunfounds.com/api/discord/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'New blog post published!',
    embeds: [{
      title: 'Blog Post: ' + postTitle,
      description: postExcerpt,
      url: `https://thelostandunfounds.com/blog/${postSlug}`,
      color: 0x00ff00,
      timestamp: new Date().toISOString(),
    }],
  }),
});
```

### Authenticate User with Discord

```typescript
// Redirect user to Discord OAuth
window.location.href = '/api/discord/oauth';
```

## 🎨 Discord Embed Formatting

Discord embeds support rich formatting:

```json
{
  "embeds": [{
    "title": "Title",
    "description": "Description text",
    "url": "https://example.com",
    "color": 0x00ff00,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "footer": {
      "text": "Footer text",
      "icon_url": "https://example.com/icon.png"
    },
    "thumbnail": {
      "url": "https://example.com/thumbnail.png"
    },
    "image": {
      "url": "https://example.com/image.png"
    },
    "author": {
      "name": "Author Name",
      "url": "https://example.com",
      "icon_url": "https://example.com/author.png"
    },
    "fields": [
      {
        "name": "Field 1",
        "value": "Value 1",
        "inline": true
      },
      {
        "name": "Field 2",
        "value": "Value 2",
        "inline": true
      }
    ]
  }]
}
```

## 🔐 Security Best Practices

1. **Never Commit Secrets**
   - Bot tokens, client secrets, and webhook URLs should NEVER be in git
   - Use environment variables only

2. **Verify Webhook Requests**
   - Discord webhook requests should be verified using the public key
   - The interaction endpoint verifies requests automatically

3. **Rate Limiting**
   - Discord API has rate limits
   - Bot: 50 requests per second
   - Webhooks: 30 requests per minute per webhook

4. **Token Security**
   - Rotate tokens if compromised
   - Use different tokens for development and production
   - Never share tokens publicly

## 🐛 Troubleshooting

### Bot Not Responding

1. **Check Bot is Online**
   - Go to your Discord server
   - Check bot appears in member list
   - Status should be green (online)

2. **Check Bot Permissions**
   - Verify bot has required permissions in server
   - Check channel permissions allow bot to send messages

3. **Check Environment Variables**
   - Verify `DISCORD_BOT_TOKEN` is set correctly
   - Check token hasn't been reset in Discord Developer Portal

### OAuth Not Working

1. **Check Redirect URL**
   - Verify redirect URL matches exactly in Discord Developer Portal
   - URLs are case-sensitive and must match protocol (http vs https)

2. **Check Scopes**
   - Ensure required scopes are selected
   - Verify client secret is correct

### Webhook Not Sending Messages

1. **Check Webhook URL**
   - Verify webhook URL is correct
   - Test webhook URL directly with curl:
     ```bash
     curl -X POST "YOUR_WEBHOOK_URL" \
       -H "Content-Type: application/json" \
       -d '{"content": "Test message"}'
     ```

2. **Check Webhook Status**
   - Go to channel settings → Integrations → Webhooks
   - Verify webhook is active and not deleted

## 📚 Discord API Resources

- [Discord Developer Documentation](https://discord.com/developers/docs)
- [Discord API Reference](https://discord.com/developers/docs/reference)
- [Discord OAuth2 Guide](https://discord.com/developers/docs/topics/oauth2)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)
- [Discord Bot Best Practices](https://discord.com/developers/docs/topics/community-resources)

## 📦 Optional Dependencies

For production use, install Ed25519 signature verification:

```bash
npm install @noble/ed25519
```

This is required for proper Discord interaction signature verification. Without it, the interactions endpoint uses basic validation (not secure for production).

## 🎯 Register Slash Commands

After setting up your bot, register slash commands for your server:

```bash
npm run discord:register-commands
```

This will register the default commands (`/ping`, `/info`, `/blog`) to your Discord server.

**Your Server ID**: `1428346383772942346`

To customize commands, edit `scripts/register-discord-commands.ts`.

## 🎉 Next Steps

After setup:
1. ✅ Bot is invited to your server
2. ✅ Environment variables are configured
3. ✅ OAuth2 is set up (if using authentication)
4. ✅ Webhook is configured (if using notifications)
5. ✅ Install @noble/ed25519 for production signature verification
6. ✅ Register slash commands with `npm run discord:register-commands`
7. ✅ Test bot commands and webhooks

## 📝 Related Documentation

- [Environment Variables Guide](./ENV_VARIABLES_COMPLETE.md)
- [Vercel Webhook Setup](./VERCEL_WEBHOOK_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_NOTES.md)
