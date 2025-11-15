# THE LOST+UNFOUNDS - Project Setup Guide

## 🎯 Project Overview

This is a new project for **thelostandunfounds.com** with integrated MCP (Model Context Protocol) registry system.

## 📋 Setup Checklist

### 1. Install Dependencies

```bash
cd thelostandunfounds
npm install
```

### 2. Set Up GitHub Repository

#### Option A: Using GitHub CLI (Recommended)

```bash
# Make script executable
chmod +x scripts/setup-github.js

# Run setup script
node scripts/setup-github.js

# Create repository on GitHub
gh repo create thelostandunfounds --public --source=. --remote=origin --push
```

#### Option B: Manual Setup

1. **Create repository on GitHub:**
   - Go to: https://github.com/new
   - Repository name: `thelostandunfounds`
   - Description: `THE LOST+UNFOUNDS - Modern web application`
   - Choose: Public or Private
   - **DO NOT** initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Connect local repository:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/thelostandunfounds.git
   git branch -M main
   git push -u origin main
   ```

### 3. Configure MCP Registry

The project uses the MCP registry system located at `../tools-registry`. 

**MCP servers are configured in Cursor IDE:**
- Go to Cursor Settings → Features → MCP
- Ensure these servers are configured:
  - PayPal MCP Server
  - Google Drive MCP Server
  - Vercel MCP Server
  - Railway MCP Server
  - Supabase MCP Server
  - GitHub MCP Server

The registry will automatically discover and load tools from these servers.

### 4. Set Up Vercel Deployment

#### Via Vercel Dashboard:

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/joshua-greenes-projects

2. **Import Project:**
   - Click "Add New Project"
   - Connect GitHub account (if not already connected)
   - Select `thelostandunfounds` repository
   - Framework Preset: **Vite**
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click "Deploy"

3. **Add Custom Domain:**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter: `thelostandunfounds.com`
   - Click "Add"
   - Follow DNS configuration instructions (if needed)

#### Via Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd thelostandunfounds
vercel

# Add domain
vercel domains add thelostandunfounds.com
```

### 5. Environment Variables

#### Required Variables (Must Set)

1. **VITE_SUPABASE_URL**
   - Get from: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api
   - Value: `https://nonaqhllakrckbtbawrb.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Get from: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys
   - Copy the **"Publishable key"** (starts with `sb_publishable_...`)

#### Optional Variables (Recommended)

3. **VITE_TURNSTILE_SITE_KEY** (Bot protection - Frontend)
   - Get from: https://dash.cloudflare.com/?to=/:account/turnstile
   - Create a new Turnstile site for `thelostandunfounds.com`
   - Copy the **Site Key** (starts with `0x...`)
   - Add to: Vercel environment variables

4. **TURNSTILE_SECRET_KEY** (Bot protection - Backend)
   - Get from: Same Cloudflare Turnstile page (after creating site)
   - Copy the **Secret Key** (different from Site Key)
   - Add to: Supabase Edge Functions secrets (NOT Vercel!)
   - **Navigation**: 
     1. Go to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb
     2. Click **"Edge Functions"** in left sidebar (under CONFIGURATION)
     3. Click **"Secrets"** tab at the top
     4. Click **"Add Secret"**
     5. Name: `TURNSTILE_SECRET_KEY`, Value: your secret key
   - ⚠️ **IMPORTANT**: Secret keys must be server-side only (Supabase), never in Vercel

#### Optional Variables (Only if using Telegram)

5. **TELEGRAM_BOT_TOKEN**
   - Get from: https://t.me/botfather (in Telegram)
   - Create bot with `/newbot` command

6. **OPENAI_API_KEY** (Only if using Telegram voice commands)
   - Get from: https://platform.openai.com/api-keys
   - Create new secret key

#### Setup Steps

**For Local Development:**
1. Create `.env.local` file in `thelostandunfounds/` directory:
   ```bash
   cd thelostandunfounds
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your keys:
   ```env
   VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
   VITE_SUPABASE_ANON_KEY=your_publishable_key_here
   VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
   ```

**For Vercel Production:**
1. Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
2. Add each variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://nonaqhllakrckbtbawrb.supabase.co`
   - Environments: All (Production, Preview, Development)
   - Click "Save"
3. Repeat for other variables

**📖 Detailed Walkthrough**: See `ENV_SETUP_WALKTHROUGH.md` for step-by-step instructions with screenshots guidance.

## 🚀 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 MCP Tools Usage

The project integrates with the MCP registry system. Tools are loaded dynamically:

```typescript
import { importTool } from '@tools/index';

// Example: Use PayPal tool
const createOrder = await importTool('paypal', 'createOrder');
const result = await createOrder.execute({
  amount: 10.00,
  currency: 'USD'
});

// Example: Use Vercel tool
const deploy = await importTool('vercel', 'deploy_to_vercel');
```

## 🔧 Project Structure

```
thelostandunfounds/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── scripts/            # Setup scripts
├── vercel.json         # Vercel configuration
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

## ✅ Verification

After setup, verify:

- [ ] GitHub repository created and connected
- [ ] Dependencies installed (`npm install`)
- [ ] Development server runs (`npm run dev`)
- [ ] Vercel project created
- [ ] Domain `thelostandunfounds.com` added to Vercel
- [ ] Domain resolves correctly
- [ ] SSL certificate active
- [ ] MCP registry tools discoverable

## 📞 Troubleshooting

### MCP Tools Not Loading

- Ensure MCP servers are configured in Cursor IDE
- Check that `tools-registry` is built: `cd ../tools-registry && npm run build`
- Verify MCP client is properly initialized

### Domain Not Resolving

- Check DNS configuration in Vercel dashboard
- Wait for DNS propagation (can take up to 48 hours)
- Verify domain is added to correct Vercel project

### Build Errors

- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires Node 18+)
- Clear cache: `rm -rf node_modules dist && npm install`

## 🎉 Next Steps

1. Customize the app in `src/App.tsx`
2. Add components in `src/components/`
3. Create pages in `src/pages/`
4. Integrate MCP tools as needed
5. Deploy updates via Git push (auto-deploys on Vercel)

