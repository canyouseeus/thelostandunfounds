# Environment Variables Setup Guide

## Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your actual Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
   
   **Get your keys from**: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys
   
   **Note**: Supabase now uses a new key format (starts with `sb_publishable_`). Copy the "Publishable key" from the API Keys page.

3. Restart your dev server:
   ```bash
   npm run dev
   ```

## Vercel Production Deployment

**IMPORTANT**: You must set these environment variables in Vercel for production to work!

### Steps to Set Environment Variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/joshua-greenes-projects/thelostandunfounds)
2. Click on your project: **thelostandunfounds**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   **Variable 1:**
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: `https://nonaqhllakrckbtbawrb.supabase.co`
   - **Environments**: Select all (Production, Preview, Development)

   **Variable 2:**
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `your_supabase_anon_key_here` (get from Supabase dashboard)
   - **Environments**: Select all (Production, Preview, Development)
   
   **Get your keys from**: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api-keys
   
   **Note**: Supabase now uses a new key format (starts with `sb_publishable_`). Copy the "Publishable key" from the API Keys page.

5. Click **Save** for each variable
6. **Redeploy** your project (Vercel will automatically redeploy, or you can manually trigger a redeploy)

### Quick Link:
[Vercel Environment Variables](https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables)

## Verification

After setting environment variables:

1. **Local**: Check browser console - should see no Supabase errors
2. **Production**: Visit https://thelostandunfounds.com and check browser console

The error should be resolved once environment variables are set!

