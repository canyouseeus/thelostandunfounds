# Environment Variables Setup Guide

This guide explains how to set up your environment variables for the project.

## Quick Setup

### Option 1: Interactive Script (Recommended)

Run the interactive setup script:

```bash
npm run setup:env
```

or

```bash
node scripts/set-env.js
```

This will prompt you to enter each environment variable.

### Option 2: Command Line

Set environment variables directly:

```bash
npm run env:set VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key
```

### Option 3: Manual Setup

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your values:
   ```bash
   nano .env.local
   # or
   code .env.local
   ```

### Option 4: Shell Script (Linux/macOS)

```bash
bash scripts/setup-env.sh
```

## Required Environment Variables

### For Client-Side (Vite)

These variables are prefixed with `VITE_` and are accessible in the browser:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `VITE_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key (optional)

### For Server-Side (API Routes)

These variables are only used in server-side code:

- `SUPABASE_URL` - Your Supabase project URL (can use same as VITE_SUPABASE_URL)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (can use same as VITE_SUPABASE_ANON_KEY)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

## Where to Find Your Keys

### Supabase Keys

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Cloudflare Turnstile

1. Go to: https://dash.cloudflare.com
2. Navigate to **Turnstile** → **Your Site**
3. Copy the **Site Key** → `VITE_TURNSTILE_SITE_KEY`

## Environment File Locations

- `.env.local` - Local development (gitignored, use this)
- `.env.example` - Example template (committed to git)
- `.env` - Alternative local file (gitignored)

**Important:** Never commit `.env.local` or `.env` files to git!

## Vercel Deployment

For Vercel deployments, add environment variables in:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for API routes)
   - `VITE_TURNSTILE_SITE_KEY` (if using)

## Example .env.local File

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key-here
```

## Troubleshooting

### Variables not working?

1. **Check file name**: Make sure it's `.env.local` (not `.env`)
2. **Check prefix**: Client-side variables must start with `VITE_`
3. **Restart dev server**: Run `npm run dev` again after changing variables
4. **Check spelling**: Variable names are case-sensitive

### Server-side variables not working?

- Make sure variables are set in Vercel dashboard for production
- For local API routes, use `SUPABASE_URL` and `SUPABASE_ANON_KEY` (without `VITE_` prefix)

## Security Notes

⚠️ **Never commit sensitive keys to git!**

- `.env.local` should be in `.gitignore`
- Only commit `.env.example` with placeholder values
- `SUPABASE_SERVICE_ROLE_KEY` has admin access - keep it secret!
- Use environment variables in Vercel for production
