# Discord IDs Explained

Understanding the different Discord IDs you'll need for integration.

## 🔑 Key IDs

### 1. **Client ID** (Application ID)
- **What it is**: Your bot application's unique identifier
- **Where to find**: Discord Developer Portal → Your Application → General Information → Application ID
- **Environment variable**: `DISCORD_CLIENT_ID`
- **Used for**: OAuth2, registering commands, identifying your bot application
- **Example**: `1234567890123456789` (your bot's application ID)

### 2. **Guild ID** (Server ID)
- **What it is**: Your Discord server's unique identifier
- **Where to find**: 
  - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
  - Right-click your Discord server → "Copy Server ID"
- **Environment variable**: `DISCORD_GUILD_ID`
- **Used for**: Server-specific features, registering guild commands, accessing server channels
- **Your Server ID**: `1428346383772942346`

### 3. **Bot Token**
- **What it is**: Secret token that authenticates your bot
- **Where to find**: Discord Developer Portal → Your Application → Bot → Reset Token
- **Environment variable**: `DISCORD_BOT_TOKEN`
- **Used for**: All bot API requests
- **⚠️ Keep this secret!** Never commit to git or share publicly

### 4. **Client Secret**
- **What it is**: Secret key for OAuth2 authentication
- **Where to find**: Discord Developer Portal → Your Application → OAuth2 → Client Secret
- **Environment variable**: `DISCORD_CLIENT_SECRET`
- **Used for**: OAuth2 token exchange
- **⚠️ Keep this secret!** Never commit to git or share publicly

### 5. **Public Key**
- **What it is**: Public key for verifying Discord interaction signatures
- **Where to find**: Discord Developer Portal → Your Application → General Information → Public Key
- **Environment variable**: `DISCORD_PUBLIC_KEY`
- **Used for**: Verifying Discord interaction requests (slash commands, buttons, etc.)

## 📊 Quick Comparison

| ID Type | What It Identifies | Where to Find | Example |
|---------|-------------------|---------------|---------|
| **Client ID** | Your bot application | Developer Portal → General Info | `1234567890123456789` |
| **Guild ID** | Your Discord server | Right-click server → Copy ID | `1428346383772942346` |
| **Bot Token** | Bot authentication | Developer Portal → Bot → Token | `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.xxxxx.xxxxx` |
| **Client Secret** | OAuth2 secret | Developer Portal → OAuth2 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| **Public Key** | Signature verification | Developer Portal → General Info | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

## ❓ Common Questions

### Q: Are Client ID and Guild ID the same?
**A: No!** They are completely different:
- **Client ID** = Your bot application (one per bot)
- **Guild ID** = Your Discord server (one per server)

### Q: Can I use the same Client ID for multiple servers?
**A: Yes!** Your bot (Client ID) can be in multiple servers. Each server has its own Guild ID.

### Q: Do I need a different Client ID for each server?
**A: No!** One bot application (Client ID) can join many servers. Each server just has a different Guild ID.

### Q: Where do I get my Guild ID?
**A:**
1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your Discord server name
3. Click "Copy Server ID"
4. Your server ID: `1428346383772942346`

## 🎯 Your Configuration

Based on your setup:
- **Guild ID**: `1428346383772942346` ✅ (Already configured)
- **Client ID**: Get from Discord Developer Portal (not set yet)
- **Bot Token**: Get from Discord Developer Portal (not set yet)
- **Client Secret**: Get from Discord Developer Portal (not set yet)
- **Public Key**: Get from Discord Developer Portal (not set yet)

## 📚 Related Documentation

- [Discord Setup Guide](./DISCORD_SETUP.md)
- [Discord Quick Reference](./DISCORD_QUICK_REFERENCE.md)
