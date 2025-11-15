# Fix: Shop Showing Wrong Products

## The Problem
The shop page is showing incorrect/made-up products instead of your actual Fourthwall products.

## Root Cause
1. **API routes don't work in Vite dev server** - They only work when deployed to Vercel
2. **Missing Storefront Token** - Even if API worked, no token is configured
3. **Local database might have test data** - Products might be coming from local DB

## Solutions

### Option 1: Use Vercel Dev (Recommended for Local Testing)

```bash
# Install Vercel CLI
npm i -g vercel

# Run in dev mode (this will execute API routes)
vercel dev
```

Then visit: http://localhost:3000/shop

### Option 2: Set Up Storefront Token and Deploy

1. Get your token from: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
2. Add to `.env.local`:
   ```env
   FOURTHWALL_STOREFRONT_TOKEN=your_token_here
   ```
3. Deploy to Vercel - API routes will work there

### Option 3: Check What's Actually Showing

Open browser console (F12) and check:
- Network tab → See what `/api/fourthwall/products` returns
- Console tab → Look for errors
- Check if products are from local database or API

## Quick Fix Right Now

**To see your actual Fourthwall products:**

1. **Get your Storefront Token** from Fourthwall admin
2. **Add it to `.env.local`** on your local Mac
3. **Use `vercel dev` instead of `npm run dev`** to run locally
4. **OR deploy to Vercel** where API routes work automatically

The API routes (`/api/fourthwall/products`) are Vercel serverless functions - they need Vercel's runtime to execute, not just Vite.
