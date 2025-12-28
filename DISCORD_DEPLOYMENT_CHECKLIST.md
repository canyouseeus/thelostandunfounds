# Discord Integration Deployment Checklist

After setting environment variables and redeploying, verify everything is working.

## ✅ Pre-Deployment Checklist

- [x] Environment variables set in Vercel
- [x] Code committed and pushed
- [x] Vercel deployment completed

## 🔍 Post-Deployment Verification

### 1. Verify API Routes Are Deployed

Check that these files exist in your deployment:
- `/api/discord/webhook.ts`
- `/api/discord/interactions.ts`
- `/api/discord/oauth/[...path].ts`

### 2. Test Endpoints

**Webhook Endpoint:**
```bash
curl https://thelostandunfounds.com/api/discord/webhook
```

**Interactions Endpoint:**
```bash
curl https://thelostandunfounds.com/api/discord/interactions
```

**OAuth Endpoint:**
```bash
curl -L https://thelostandunfounds.com/api/discord/oauth
```

### 3. Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Navigate to your project
3. Go to **Functions** tab
4. Check for `/api/discord/*` functions
5. Review logs for any errors

### 4. Verify Environment Variables

In Vercel Dashboard → Settings → Environment Variables, verify:
- ✅ `DISCORD_BOT_TOKEN`
- ✅ `DISCORD_CLIENT_ID` = `1428346383772942346`
- ✅ `DISCORD_CLIENT_SECRET`
- ✅ `DISCORD_PUBLIC_KEY`
- ✅ `DISCORD_GUILD_ID` = `833383219083608084`
- ⚠️ `DISCORD_WEBHOOK_URL` (optional)

### 5. Register Slash Commands

After deployment, register your bot commands:

```bash
# Set environment variables locally
export DISCORD_BOT_TOKEN=your_token
export DISCORD_CLIENT_ID=1428346383772942346
export DISCORD_GUILD_ID=833383219083608084

# Register commands
npm run discord:register-commands
```

### 6. Configure Discord Interactions URL

1. Go to Discord Developer Portal
2. Navigate to your application
3. Go to **General Information**
4. Set **Interactions Endpoint URL** to:
   ```
   https://thelostandunfounds.com/api/discord/interactions
   ```
5. Click **Save Changes**
6. Discord will verify the endpoint (sends a ping)

### 7. Test Bot in Discord

1. Make sure bot is in your server
2. Type `/` in a channel
3. You should see your bot's commands:
   - `/ping`
   - `/info`
   - `/blog`
4. Try `/ping` - should respond with "Pong! 🏓"

## 🐛 Troubleshooting

### Endpoints Return 404

**Possible causes:**
- Files not committed/pushed
- Vercel hasn't rebuilt yet
- API route structure incorrect

**Solution:**
1. Verify files are in repository
2. Trigger a new deployment
3. Check Vercel build logs

### Endpoints Return 500

**Possible causes:**
- Missing environment variables
- Invalid credentials
- Code errors

**Solution:**
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test endpoints locally first

### Interactions Endpoint Not Verified

**Possible causes:**
- Public key incorrect
- Signature verification failing
- Endpoint not responding correctly

**Solution:**
1. Verify `DISCORD_PUBLIC_KEY` is correct
2. Install `@noble/ed25519` for proper verification:
   ```bash
   npm install @noble/ed25519
   ```
3. Check function logs for errors

### Commands Not Appearing

**Possible causes:**
- Commands not registered
- Bot not in server
- Wrong Guild ID

**Solution:**
1. Run `npm run discord:register-commands`
2. Verify bot is in server
3. Check `DISCORD_GUILD_ID` is correct (`833383219083608084`)
4. Wait a few minutes (Discord caches commands)

## 📊 Expected Results

### Successful Deployment

✅ All endpoints return 200 or 302  
✅ Webhook can send messages  
✅ Interactions endpoint verified in Discord  
✅ Commands appear in Discord  
✅ Bot responds to commands  

## 🎯 Next Steps After Deployment

1. ✅ Test all endpoints
2. ✅ Register slash commands
3. ✅ Configure Interactions URL in Discord
4. ✅ Test bot commands in Discord
5. ✅ Set up webhook notifications (optional)

## 📚 Related Documentation

- [Discord Setup Guide](./DISCORD_SETUP.md)
- [Discord Testing Guide](./DISCORD_TESTING.md)
- [Discord Quick Reference](./DISCORD_QUICK_REFERENCE.md)
