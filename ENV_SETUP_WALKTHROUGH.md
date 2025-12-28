# Environment Variables Setup Walkthrough

## 🎯 Overview
This guide walks you through getting and adding all environment variables for your project.

---

## ✅ Already Set (Required)
- ✅ `VITE_SUPABASE_URL` - Set
- ✅ `VITE_SUPABASE_ANON_KEY` - Set

---

## 🔐 Missing Variables to Add

### 1. VITE_TURNSTILE_SITE_KEY (Recommended)
**Purpose**: Bot protection for email signup form  
**Status**: Optional but recommended for production  
**Location**: Vercel environment variables (frontend)

### 1b. TURNSTILE_SECRET_KEY (Required if using Turnstile)
**Purpose**: Server-side verification of Turnstile tokens  
**Status**: Required if you're using Turnstile  
**Location**: Supabase Edge Functions secrets (backend)  
**⚠️ IMPORTANT**: This goes in Supabase, NOT Vercel (secret keys must be server-side only)

#### Step-by-Step:

1. **Go to Cloudflare Dashboard**
   - Link: https://dash.cloudflare.com/
   - Sign in with your Cloudflare account

2. **Navigate to Turnstile**
   - In the left sidebar, click **"Turnstile"**
   - Or go directly: https://dash.cloudflare.com/?to=/:account/turnstile

3. **Create a New Site**
   - Click **"Add Site"** or **"Create"** button
   - Fill in the form:
     - **Site Name**: `THE LOST+UNFOUNDS` (or any name)
     - **Domain**: `thelostandunfounds.com`
     - **Widget Mode**: Select **"Managed"** (recommended)
   - Click **"Create"**

4. **Copy Your Site Key**
   - After creation, you'll see two keys:
     - **Site Key** (starts with `0x...`) ← Copy this one for frontend
     - **Secret Key** (starts with `0x...` or different format) ← Copy this one for backend
   - Click the copy icon next to **Site Key** (you'll need the Secret Key in the next step)

5. **Add Site Key to Vercel** (Frontend)
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - Click **"Add New"** or use the input fields at the top
   - **Key**: `VITE_TURNSTILE_SITE_KEY`
   - **Value**: Paste your Site Key (starts with `0x...`)
   - **Environments**: Select all (Production, Preview, Development)
   - Click **"Save"**

6. **Add Secret Key to Supabase Edge Functions** (Backend - IMPORTANT!)
   
   **Option A: Via Dashboard (Recommended)**
   - Go to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb
   - In the left sidebar, click **"Edge Functions"** (under CONFIGURATION)
   - Click on the **"Secrets"** tab at the top
   - Click **"Add Secret"** or **"New Secret"**
   - **Name**: `TURNSTILE_SECRET_KEY`
   - **Value**: Paste your Secret Key (from Cloudflare - NOT the Site Key)
   - Click **"Save"**
   
   **Option B: Via Supabase CLI** (Alternative)
   ```bash
   # Install Supabase CLI (if not installed)
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link to your project
   supabase link --project-ref nonaqhllakrckbtbawrb
   
   # Set the secret
   supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
   ```
   
   **Note**: This is stored in Supabase, NOT Vercel (for security - secret keys should never be exposed to the client)

7. **Add to Local `.env.local`** (Frontend only - Site Key)
   - Open `thelostandunfounds/.env.local`
   - Add: `VITE_TURNSTILE_SITE_KEY=your_site_key_here`
   - **DO NOT** add the secret key to `.env.local` (it's server-side only)
   - Save the file

---

### 2. TELEGRAM_BOT_TOKEN (Optional - Only if using Telegram)
**Purpose**: Telegram bot integration for voice commands  
**Status**: Optional - only needed if you want Telegram integration

#### Step-by-Step:

1. **Create Telegram Bot**
   - Open Telegram app or web: https://web.telegram.org/
   - Search for **[@BotFather](https://t.me/botfather)** in Telegram
   - Click **"Start"** or send `/start`

2. **Create New Bot**
   - Send `/newbot` command
   - Follow prompts:
     - Enter a name for your bot (e.g., "THE LOST+UNFOUNDS Bot")
     - Enter a username (must end in `bot`, e.g., `thelostandunfounds_bot`)
   - BotFather will give you a token like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

3. **Copy Bot Token**
   - Copy the token immediately (you won't see it again)
   - Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

4. **Add to Vercel**
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - **Key**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Paste your bot token
   - **Environments**: Select all
   - Click **"Save"**

5. **Add to Local `.env.local`** (optional, only if testing locally)
   - Add: `TELEGRAM_BOT_TOKEN=your_bot_token_here`

---

### 3. OPENAI_API_KEY (Optional - Only if using Telegram voice commands)
**Purpose**: Voice transcription for Telegram voice commands  
**Status**: Optional - only needed for Telegram voice features

#### Step-by-Step:

1. **Go to OpenAI Platform**
   - Link: https://platform.openai.com/
   - Sign in or create an account

2. **Navigate to API Keys**
   - Click your profile icon (top right)
   - Select **"API keys"** from dropdown
   - Or go directly: https://platform.openai.com/api-keys

3. **Create New API Key**
   - Click **"Create new secret key"**
   - Give it a name (e.g., "THE LOST+UNFOUNDS Telegram")
   - Click **"Create secret key"**
   - **IMPORTANT**: Copy the key immediately (starts with `sk-...`)
   - You won't be able to see it again!

4. **Add to Vercel**
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Paste your API key (starts with `sk-...`)
   - **Environments**: Select all
   - Click **"Save"**

5. **Add to Local `.env.local`** (optional, only if testing locally)
   - Add: `OPENAI_API_KEY=sk-your_key_here`

---

### 4. AUTH_REDIRECT_URL (Optional - Usually not needed)
**Purpose**: Custom OAuth redirect URL  
**Status**: Optional - defaults to `http://localhost:5173/auth/callback` in dev

**Note**: You probably don't need this unless you're using a custom OAuth redirect URL. The default should work fine.

If you do need it:
- **Value**: `https://thelostandunfounds.com/auth/callback` (or your custom URL)
- Add to Vercel same way as above

---

## 📋 Quick Checklist

### Required (Already Set ✅)
- [x] `VITE_SUPABASE_URL`
- [x] `VITE_SUPABASE_ANON_KEY`

### Recommended
- [ ] `VITE_TURNSTILE_SITE_KEY` - Bot protection (Frontend)
  - Get from: https://dash.cloudflare.com/?to=/:account/turnstile
  - Add to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

- [ ] `TURNSTILE_SECRET_KEY` - Bot protection verification (Backend)
  - Get from: Same Cloudflare Turnstile page (Secret Key)
  - Add to: Supabase Dashboard → Edge Functions → Secrets tab
  - Direct link: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/functions (then click "Secrets" tab)
  - ⚠️ **IMPORTANT**: Goes in Supabase Edge Functions secrets, NOT Vercel!

### Optional (Only if using Telegram)
- [ ] `TELEGRAM_BOT_TOKEN` - Telegram bot
  - Get from: https://t.me/botfather (in Telegram)
  - Add to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

- [ ] `OPENAI_API_KEY` - Voice transcription
  - Get from: https://platform.openai.com/api-keys
  - Add to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

---

## 🔗 Quick Links

### Vercel Environment Variables
**Direct Link**: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

### Service Dashboards
- **Cloudflare Turnstile**: https://dash.cloudflare.com/?to=/:account/turnstile
- **Supabase Edge Functions**: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/functions (click "Secrets" tab)
- **Telegram BotFather**: https://t.me/botfather (open in Telegram)
- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **Supabase API Keys**: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys

---

## ✅ After Adding Variables

1. **Vercel will auto-redeploy** when you save environment variables
2. **Wait for deployment** to complete (check Vercel dashboard)
3. **Test your site**: Visit https://thelostandunfounds.com
4. **Verify in browser console**: Should see no Supabase errors

---

## 🚨 Security Reminders

- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ Never share API keys in chat or documentation
- ✅ Use placeholders in examples (`your_key_here`)
- ✅ Rotate keys if accidentally exposed

---

## 📝 Local Development

After adding variables to Vercel, also update your local `.env.local`:

```bash
cd thelostandunfounds
# Edit .env.local and add:
VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key_here
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
# ... other optional variables
```

Then restart your dev server:
```bash
npm run dev
```

