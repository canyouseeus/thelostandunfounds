# Solution: Shop Showing Wrong Products

## The Problem
Your shop page is showing incorrect products because:
1. **API routes don't execute in Vite dev** - `/api/fourthwall/products` returns source code, not JSON
2. **Missing Storefront Token** - No token configured to fetch real products

## Quick Fix: Use Vercel Dev

**On your Mac, run:**

```bash
# Install Vercel CLI (one time)
npm i -g vercel

# Navigate to project
cd /path/to/thelostandunfounds

# Run with Vercel (this executes API routes)
vercel dev
```

Then visit: **http://localhost:3000/shop**

## Better Fix: Set Up Storefront Token

1. **Get your token:**
   - Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers
   - Copy your **Storefront Token**

2. **Add to `.env.local` on your Mac:**
   ```bash
   cd /path/to/thelostandunfounds
   echo "FOURTHWALL_STOREFRONT_TOKEN=your_token_here" >> .env.local
   ```

3. **Run with Vercel:**
   ```bash
   vercel dev
   ```

## Why This Happens

- `/api/fourthwall/products.ts` is a **Vercel serverless function**
- Vite dev server can't execute TypeScript serverless functions
- You need `vercel dev` to run them locally, OR deploy to Vercel

## Alternative: Deploy to Vercel

Once deployed, the API routes work automatically:
1. Push to GitHub
2. Deploy on Vercel
3. Add `FOURTHWALL_STOREFRONT_TOKEN` in Vercel environment variables
4. Visit your deployed site's `/shop` page

---

**TL;DR:** Use `vercel dev` instead of `npm run dev` to see your real Fourthwall products locally.
