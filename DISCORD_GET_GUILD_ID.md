# How to Get Your Discord Guild ID (Server ID)

There are several ways to get your Discord server's Guild ID:

## Method 1: From Channel URL (Easiest)

If you have a channel URL, the Guild ID is the first number:

```
https://discord.com/channels/GUILD_ID/CHANNEL_ID
```

**Example:**
- Your channel URL: `https://discord.com/channels/833383219083608084/833383219083608086`
- **Guild ID**: `833383219083608084` (first number)
- Channel ID: `833383219083608086` (second number)

## Method 2: Right-Click Server (Requires Developer Mode)

1. **Enable Developer Mode**
   - Open Discord
   - Go to **User Settings** (gear icon)
   - Go to **Advanced**
   - Enable **Developer Mode**

2. **Copy Server ID**
   - Right-click your Discord server name (in the server list)
   - Click **"Copy Server ID"**
   - The ID is now in your clipboard

## Method 3: From Browser (If You're on the Server)

1. Open your Discord server in a web browser
2. Look at the URL - it will contain the Guild ID
3. The format is usually: `https://discord.com/channels/GUILD_ID/...`

## Method 4: Using Discord Bot (If Already Set Up)

If your bot is already in the server, you can use the API:

```typescript
import { getDiscordGuild } from '@/lib/discord/utils'

const guild = await getDiscordGuild('833383219083608084', process.env.DISCORD_BOT_TOKEN!)
console.log('Guild ID:', guild.id)
```

## ✅ Your Configuration

Based on your channel URL:
- **Guild ID**: `833383219083608084` ✅
- **Client ID**: `1428346383772942346` ✅ (Your Application ID)

## 📝 Quick Reference

| What | ID | Where to Find |
|------|----|--------------|
| **Guild ID** | `833383219083608084` | First number in channel URL |
| **Client ID** | `1428346383772942346` | Discord Developer Portal → General Information |
| **Channel ID** | `833383219083608086` | Second number in channel URL |

## 🔗 Related

- [Discord Setup Guide](./DISCORD_SETUP.md)
- [Discord IDs Explained](./DISCORD_IDS_EXPLAINED.md)
