# Discord Integration - Next Steps

## 🎯 Current Status

✅ **Code Complete**: All Discord integration files are ready  
✅ **Environment Variables**: Set in Vercel  
⚠️ **Deployment**: Needs to be merged to `main` branch  

## 📋 Step-by-Step Next Steps

### Step 1: Merge to Main Branch

The Discord code is on a cursor branch. Merge it to `main` to deploy:

```bash
# Switch to main
git checkout main
git pull origin main

# Merge the Discord integration
git merge cursor/setup-discord-server-integration-gemini-3-pro-preview-3b68

# Push to trigger deployment
git push origin main
```

**Note**: Vercel will automatically deploy when you push to `main`.

### Step 2: Verify Deployment (Wait 2-3 minutes)

After pushing, wait for Vercel to deploy, then test:

```bash
# Test webhook endpoint
curl https://thelostandunfounds.com/api/discord/webhook

# Should return:
# {"message": "Discord webhook endpoint is active", ...}

# Test interactions endpoint  
curl https://thelostandunfounds.com/api/discord/interactions

# Should return:
# {"message": "Discord interactions endpoint is active", ...}
```

### Step 3: Configure Discord Interactions URL

1. **Go to Discord Developer Portal**
   - Link: https://discord.com/developers/applications
   - Select your application

2. **Set Interactions Endpoint URL**
   - Go to **General Information** tab
   - Scroll to **Interactions Endpoint URL**
   - Enter: `https://thelostandunfounds.com/api/discord/interactions`
   - Click **Save Changes**

3. **Discord Will Verify**
   - Discord automatically sends a ping to verify the endpoint
   - You should see a green checkmark if successful
   - If it fails, check Vercel function logs

### Step 4: Register Slash Commands

After the interactions endpoint is verified, register your bot commands:

```bash
# Make sure you have environment variables set locally
# Or use Vercel CLI to pull them:
vercel env pull .env.local

# Register commands
npm run discord:register-commands
```

**Expected output:**
```
Registering commands for guild: 833383219083608084
✅ Commands registered successfully!
Registered commands:
  - /ping: Check if the bot is online
  - /info: Get information about THE LOST+UNFOUNDS
  - /blog: Get information about blog posts
```

### Step 5: Test Bot in Discord

1. **Go to Your Discord Server**
   - Server ID: `833383219083608084`
   - Make sure your bot is in the server

2. **Test Commands**
   - Type `/` in any channel
   - You should see your bot's commands:
     - `/ping`
     - `/info`
     - `/blog`
   
3. **Try `/ping`**
   - Should respond with: "Pong! 🏓"

### Step 6: Test Webhook (Optional)

If you set `DISCORD_WEBHOOK_URL`, test sending a message:

```bash
curl -X POST https://thelostandunfounds.com/api/discord/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🧪 Test message from API",
    "embeds": [{
      "title": "Integration Test",
      "description": "Discord webhook is working!",
      "color": 65280
    }]
  }'
```

## 🔍 Troubleshooting

### Endpoints Still Return 404

**Check:**
- Did you merge to `main`?
- Did you push to `origin/main`?
- Check Vercel dashboard for deployment status
- Wait 2-3 minutes for deployment to complete

### Interactions URL Verification Fails

**Check:**
- Is `DISCORD_PUBLIC_KEY` set correctly in Vercel?
- Check Vercel function logs for errors
- Install `@noble/ed25519` for proper signature verification:
  ```bash
  npm install @noble/ed25519
  ```
- Redeploy after installing

### Commands Don't Appear

**Check:**
- Did you run `npm run discord:register-commands`?
- Is the bot in your server?
- Is `DISCORD_GUILD_ID` correct? (`833383219083608084`)
- Commands may take a few minutes to appear (Discord caches)

### Bot Doesn't Respond

**Check:**
- Is the bot online in your server?
- Check bot permissions in server settings
- Verify `DISCORD_BOT_TOKEN` is correct
- Check Vercel function logs for errors

## ✅ Success Checklist

After completing all steps, you should have:

- [ ] Code merged to `main` and deployed
- [ ] Webhook endpoint responding (`/api/discord/webhook`)
- [ ] Interactions endpoint responding (`/api/discord/interactions`)
- [ ] Interactions URL verified in Discord Developer Portal
- [ ] Slash commands registered
- [ ] Commands appearing in Discord (`/ping`, `/info`, `/blog`)
- [ ] Bot responding to commands
- [ ] Webhook sending messages (if configured)

## 🎉 You're Done!

Once all checkboxes are checked, your Discord integration is fully set up and working!

## 📚 Documentation

- [Discord Setup Guide](./DISCORD_SETUP.md) - Complete setup instructions
- [Discord Testing Guide](./DISCORD_TESTING.md) - Testing procedures
- [Discord Status](./DISCORD_STATUS.md) - Current status
- [Discord Quick Reference](./DISCORD_QUICK_REFERENCE.md) - Quick API reference
