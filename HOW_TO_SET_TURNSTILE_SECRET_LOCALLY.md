# How to Set Turnstile Secret Key Locally

## ⚠️ Important: Secret Key vs Site Key

**The Turnstile Secret Key should NOT go in `.env.local`** because:
- Secret keys must never be exposed to the client (browser)
- `.env.local` is for frontend environment variables (VITE_*)
- Secret keys are only used server-side in Supabase Edge Functions

## ✅ Correct Setup

### Frontend (`.env.local`) - Site Key Only
```env
# ✅ CORRECT - This goes in .env.local
VITE_TURNSTILE_SITE_KEY=your_site_key_here

# ❌ WRONG - Never put secret key here!
# TURNSTILE_SECRET_KEY=your_secret_key_here  # DON'T DO THIS!
```

### Backend (Supabase Edge Functions) - Secret Key Only
The secret key goes in **Supabase Edge Functions secrets**, not in `.env.local`.

## 🔧 How to Set Secret Key for Local Testing

If you're testing Edge Functions locally, use **Supabase CLI**:

### Option 1: Via Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref nonaqhllakrckbtbawrb

# Set the secret (this syncs to your Supabase project)
supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
```

**Note**: This sets the secret in your Supabase project (cloud), which works for both local Edge Function testing and production.

### Option 2: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb
2. Click **"Edge Functions"** in left sidebar
3. Click **"Secrets"** tab
4. Click **"Add Secret"**
5. Name: `TURNSTILE_SECRET_KEY`
6. Value: Your secret key
7. Click **"Save"**

## 📋 Summary

| Key Type | Location | Purpose |
|----------|----------|---------|
| **Site Key** (`VITE_TURNSTILE_SITE_KEY`) | `.env.local` + Vercel | Frontend widget display |
| **Secret Key** (`TURNSTILE_SECRET_KEY`) | Supabase Edge Functions secrets | Backend token verification |

## 🚨 Security Reminder

- ✅ **Site Key** = Public, safe to expose → Goes in `.env.local`
- ❌ **Secret Key** = Private, must be server-side only → Goes in Supabase secrets

## 🧪 Testing Locally

1. **Set Site Key in `.env.local`**:
   ```bash
   # Edit .env.local
   VITE_TURNSTILE_SITE_KEY=your_site_key_here
   ```

2. **Set Secret Key in Supabase** (via CLI or Dashboard):
   ```bash
   supabase secrets set TURNSTILE_SECRET_KEY=your_secret_key_here
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

4. **Test**: The Turnstile widget should appear, and token verification will work via Supabase Edge Functions.

## ❓ Why Not in `.env.local`?

- `.env.local` files can be accidentally committed to git
- Frontend code can access `.env.local` variables (they're bundled into the app)
- Secret keys must never reach the browser
- Supabase Edge Functions run server-side, so secrets are safe there

---

**Bottom Line**: Use Supabase CLI or Dashboard to set the secret key. It will work for both local testing and production automatically.


