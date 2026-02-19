# Required Environment Variables for Vercel

## ✅ Currently Set (Required)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase publishable key (for client-side auth)

## ⚠️ Missing (Optional but Recommended)

### For Email Signup Form (Cloudflare Turnstile)
- `VITE_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key
  - **Purpose**: Bot protection for email signup form
  - **Status**: Optional (form works without it, but shows warning in dev)
  - **Get from**: Cloudflare Dashboard → Turnstile

### For Telegram Integration (if using)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_ALLOWED_USER_IDS` - Comma-separated user IDs (optional)
- `OPENAI_API_KEY` - For voice transcription (optional)
- `HEALTH_CHECK_URL` - Health check endpoint (optional)

### For Auth Callbacks (if using custom redirect)
- `AUTH_REDIRECT_URL` - Custom OAuth redirect URL (optional, defaults to localhost)

## 🔐 About MCP Servers and Key Management

**Important**: MCP servers do NOT manage or store your Vercel environment variables.

### How MCP Servers Work:
1. **MCP servers are configured in Cursor IDE** - They're development tools for AI assistance
2. **MCP servers access external services** - PayPal, Google Drive, Vercel, Railway, Supabase, GitHub
3. **MCP server credentials** - Stored in Cursor IDE settings (not in Vercel)
4. **Your app's environment variables** - Stored in Vercel (for production) and `.env.local` (for local dev)

### The Architecture:
```
┌─────────────────┐
│  Cursor IDE     │ ← MCP Servers configured here
│  (Development)  │   (PayPal, GDrive, Vercel, etc.)
└─────────────────┘
         │
         │ Uses MCP tools to help you code
         │
┌─────────────────┐
│  Your App       │ ← Environment variables here
│  (Vercel)       │   (Supabase, Turnstile, etc.)
└─────────────────┘
```

### What This Means:
- ✅ **MCP servers** = Development tools (help AI write code, deploy, etc.)
- ✅ **Environment variables** = Runtime configuration (your app needs these to run)
- ❌ **MCP servers do NOT manage** your app's environment variables
- ✅ **You manage** environment variables directly in Vercel dashboard

## 📋 Complete Environment Variable Checklist

### Required for Production:
- [x] `VITE_SUPABASE_URL`
- [x] `VITE_SUPABASE_ANON_KEY`

### Optional (add as needed):
- [ ] `VITE_TURNSTILE_SITE_KEY` (for bot protection)
- [ ] `TELEGRAM_BOT_TOKEN` (if using Telegram integration)
- [ ] `OPENAI_API_KEY` (if using Telegram voice commands)
- [ ] `AUTH_REDIRECT_URL` (if using custom OAuth redirect)

## 🎯 Next Steps

1. **Current Status**: You have the required Supabase variables set ✅
2. **Optional**: Add `VITE_TURNSTILE_SITE_KEY` if you want bot protection on email signup
3. **MCP Servers**: Already configured in Cursor IDE - no action needed

The app should work now with just the Supabase variables!

## 🧪 Sandbox PayPal (testing-only)
- `PAYPAL_ENVIRONMENT` = `SANDBOX`
- `PAYPAL_CLIENT_ID_SANDBOX` = your **Sandbox** REST client ID
- `PAYPAL_CLIENT_SECRET_SANDBOX` = your **Sandbox** REST secret
- Optional: `PAYPAL_RETURN_URL_SANDBOX` = `http://localhost:3000` (local) or your preview URL  
- Tip: Use the seed helper to stand up a sandbox affiliate/product cost: `scripts/tests/setup-sandbox-affiliate.sql` (fill placeholders first).

## 💳 Live PayPal
- `PAYPAL_ENVIRONMENT` = `LIVE`
- `PAYPAL_CLIENT_ID` (or `PAYPAL_CLIENT_ID_LIVE`) = your **Live** REST client ID
- `PAYPAL_CLIENT_SECRET` (or `PAYPAL_CLIENT_SECRET_LIVE`) = your **Live** REST secret
- Optional: `PAYPAL_RETURN_URL` = your production domain (e.g., `https://www.thelostandunfounds.com`)
- Tip: On Vercel, scope sandbox vars to Preview/Development and live vars to Production.


