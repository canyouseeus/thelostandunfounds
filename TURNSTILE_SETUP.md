# Cloudflare Turnstile Setup Guide

## Step 1: Get Your Turnstile Keys from Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** (in the left sidebar)
3. Click **Add Site** or **Create**
4. Fill in the form:
   - **Site Name**: `THE LOST+UNFOUNDS` (or any name you prefer)
   - **Domain**: `thelostandunfounds.com` (add your domain)
   - **Widget Mode**: `Managed` (recommended) or `Non-interactive`
5. Click **Create**
6. Copy your **Site Key** and **Secret Key**

## Step 2: Configure Frontend Environment Variable

1. Create a `.env.local` file in the `thelostandunfounds/` directory:
   ```bash
   cd thelostandunfounds
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Site Key:
   ```env
   VITE_TURNSTILE_SITE_KEY=your_actual_site_key_here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

## Step 3: Configure Backend (Supabase Edge Function)

The backend needs the **Secret Key** (NOT the Site Key) to verify tokens.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **Add Secret**
5. Add:
   - **Name**: `TURNSTILE_SECRET_KEY`
   - **Value**: Your Turnstile Secret Key (from Cloudflare)
6. Click **Save**

## Step 4: Deploy Edge Function (if needed)

If you haven't deployed the Edge Function yet:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy make-server-31915980
```

## Step 5: Test

1. Start your dev server: `npm run dev`
2. Visit the homepage
3. You should see the Turnstile widget below the email input
4. Complete the challenge and try submitting the form

## Troubleshooting

### Turnstile widget not showing
- Check that `VITE_TURNSTILE_SITE_KEY` is set in `.env.local`
- Make sure you restarted the dev server after adding the env variable
- Check browser console for errors

### "Security verification failed" error
- Verify `TURNSTILE_SECRET_KEY` is set in Supabase Edge Function secrets
- Check that the Secret Key matches your Cloudflare dashboard
- Review Edge Function logs in Supabase dashboard

### Form works but emails not saving
- Ensure the `newsletter_subscribers` table exists in Supabase
- Check Supabase Edge Function logs for errors
- Verify RLS policies allow inserts

## Production Deployment

### Vercel
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `VITE_TURNSTILE_SITE_KEY` with your production Site Key
4. Redeploy

### Supabase Edge Function
The `TURNSTILE_SECRET_KEY` secret is already configured in Supabase and will work in production automatically.

