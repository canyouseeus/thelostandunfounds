# CLI Login Guide for All Integrations

## ✅ Integrations with CLI Login Support

### 1. Supabase ✅
**CLI Command**: 
```bash
npx supabase login
# or
supabase login
```

**What it does**:
- Opens browser for authentication
- Stores credentials locally
- Allows CLI access to Supabase projects

**After login, you can**:
- Link projects: `npx supabase link --project-ref nonaqhllakrckbtbawrb`
- Set secrets: `npx supabase secrets set KEY=value`
- List secrets: `npx supabase secrets list`
- Deploy functions: `npx supabase functions deploy`
- Run migrations: `npx supabase db push`

**Installation** (if needed):
```bash
npm install -g supabase
# or use npx (no installation needed)
```

---

### 2. Vercel ✅
**CLI Command**:
```bash
vercel login
```

**What it does**:
- Opens browser for authentication
- Stores credentials locally
- Allows CLI access to Vercel projects

**After login, you can**:
- Link projects: `vercel link`
- Deploy: `vercel` or `vercel --prod`
- List deployments: `vercel ls`
- View logs: `vercel logs`
- Manage domains: `vercel domains add domain.com`
- Set env vars: `vercel env add KEY`

**Installation** (if needed):
```bash
npm install -g vercel
```

**Quick Setup**:
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
vercel login
vercel link  # Links to existing project
```

---

### 3. Railway ✅
**CLI Command**:
```bash
railway login
```

**What it does**:
- Opens browser for authentication
- Stores credentials locally
- Allows CLI access to Railway projects

**After login, you can**:
- Create projects: `railway project new project-name`
- Link projects: `railway link`
- Deploy: `railway up`
- View logs: `railway logs`
- Set variables: `railway variables set KEY=value`
- Generate domain: `railway domain`

**Installation** (if needed):
```bash
npm install -g @railway/cli
# or
brew install railway
```

**Check if installed**:
```bash
railway --version
```

---

## ❌ Integrations WITHOUT CLI Login (API Key Only)

### 4. Cloudflare Turnstile ❌
**No CLI login** - Uses API keys from dashboard

**How to get keys**:
1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Create a site or select existing
3. Copy **Site Key** (for frontend)
4. Copy **Secret Key** (for backend)

**Where to set**:
- Site Key → Vercel environment variables (`VITE_TURNSTILE_SITE_KEY`)
- Secret Key → Supabase Edge Functions secrets (`TURNSTILE_SECRET_KEY`)

**Note**: You can set the secret key via Supabase CLI after logging in:
```bash
npx supabase login
npx supabase link --project-ref nonaqhllakrckbtbawrb
npx supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key
```

---

### 5. Telegram Bot ❌
**No CLI login** - Uses bot token from BotFather

**How to get token**:
1. Open Telegram: https://web.telegram.org/
2. Search for `@BotFather`
3. Send `/newbot` command
4. Follow prompts to create bot
5. Copy the token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

**Where to set**:
- Vercel environment variables (`TELEGRAM_BOT_TOKEN`)

---

### 6. OpenAI ❌
**No CLI login** - Uses API keys from dashboard

**How to get API key**:
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-...`)

**Where to set**:
- Vercel environment variables (`OPENAI_API_KEY`)

---

## 🚀 Quick Setup Script

Here's a script to login to all CLI-supported integrations:

```bash
#!/bin/bash
# Login to all CLI-supported integrations

echo "🔐 Logging into Supabase..."
npx supabase login

echo "🔐 Logging into Vercel..."
vercel login

echo "🔐 Logging into Railway..."
railway login

echo "✅ All CLI logins complete!"
```

**Save as `login-all.sh`** and run:
```bash
chmod +x login-all.sh
./login-all.sh
```

---

## 📋 Complete Login Checklist

### CLI Logins (Run these commands):
- [ ] **Supabase**: `npx supabase login`
- [ ] **Vercel**: `vercel login`
- [ ] **Railway**: `railway login` (if using Railway)

### API Keys (Set via dashboards):
- [ ] **Cloudflare Turnstile**: Get from https://dash.cloudflare.com/
  - Site Key → Vercel env vars
  - Secret Key → Supabase secrets (via CLI: `npx supabase secrets set`)
- [ ] **Telegram Bot**: Get from @BotFather → Vercel env vars
- [ ] **OpenAI**: Get from https://platform.openai.com/api-keys → Vercel env vars

---

## 🔗 Useful Commands After Login

### Supabase
```bash
# Link project
npx supabase link --project-ref nonaqhllakrckbtbawrb

# List secrets
npx supabase secrets list

# Set secret
npx supabase secrets set KEY=value

# Deploy function
npx supabase functions deploy function-name
```

### Vercel
```bash
# Link project
vercel link

# Deploy
vercel --prod

# List deployments
vercel ls

# View logs
vercel logs

# Add environment variable
vercel env add KEY
```

### Railway
```bash
# Link project
railway link

# Deploy
railway up

# View logs
railway logs

# Set variable
railway variables set KEY=value

# Generate domain
railway domain
```

---

## 🎯 Summary

**CLI Login Available** ✅:
- Supabase (`npx supabase login`)
- Vercel (`vercel login`)
- Railway (`railway login`)

**API Key Only** ❌:
- Cloudflare Turnstile (dashboard only)
- Telegram Bot (BotFather only)
- OpenAI (dashboard only)

**Note**: Even though Cloudflare, Telegram, and OpenAI don't have CLI login, you can still manage their keys via CLI after logging into Supabase/Vercel:
- Cloudflare Secret Key → Set via `npx supabase secrets set`
- Telegram/OpenAI keys → Set via `vercel env add`

---

## ✅ Next Steps

1. **Run CLI logins** for Supabase, Vercel, and Railway
2. **Get API keys** from dashboards for Cloudflare, Telegram, OpenAI
3. **Set keys** via CLI commands (Supabase secrets, Vercel env vars)
4. **Verify** everything is working

**Ready to start?** Run the login commands above! 🚀

