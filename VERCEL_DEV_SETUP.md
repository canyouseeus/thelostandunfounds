# Vercel Dev Setup Guide

## ⚠️ Important Note

**API routes (`/api/*`) only work in production on Vercel.** 

`vercel dev` has compatibility issues with Vite's dev server in this setup. For local development:
- Use `npm run dev` for frontend development (faster, no API routes)
- Test API routes in production deployment on Vercel
- The shop page will show a helpful message in local dev explaining this

## Quick Start

### For Frontend Development (Recommended)

```bash
npm run dev
```

This uses Vite and is fast, but API routes won't work locally.

### For API Route Testing

API routes must be tested in production:
1. Deploy to Vercel: `git push` (auto-deploys)
2. Test on your production URL: `https://thelostandunfounds.com/shop`

## First Time Setup

### 1. Login to Vercel

If you haven't logged in yet:

```bash
npx vercel login
```

Follow the prompts to authenticate with Vercel.

### 2. Link Project (if needed)

The project should already be linked (`.vercel/project.json` exists), but if you need to link it:

```bash
npx vercel link
```

Select your existing project: `thelostandunfounds`

### 3. Pull Environment Variables

Pull your production environment variables for local use:

```bash
npx vercel env pull .env.local
```

This will download your Vercel environment variables (including `FOURTHWALL_STOREFRONT_TOKEN`) to `.env.local`.

## Usage

### Start Dev Server with API Routes

```bash
npm run dev:api
```

The server will start on `http://localhost:3000` (or another port if 3000 is taken).

### Regular Dev Server (No API Routes)

For frontend-only development:

```bash
npm run dev
```

This uses Vite and is faster, but API routes won't work.

## Environment Variables

When using `vercel dev`, it automatically uses environment variables from your Vercel project. Make sure these are set in Vercel:

- `FOURTHWALL_STOREFRONT_TOKEN` - Your Fourthwall storefront token
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Any other environment variables your app needs

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Vercel will automatically use the next available port. Check the terminal output for the actual URL.

### API Routes Still Not Working

1. Make sure you're using `npm run dev:api` (not `npm run dev`)
2. Check that you're logged in: `npx vercel whoami`
3. Verify environment variables: `npx vercel env pull .env.local`
4. Check the terminal for any error messages

### Authentication Issues

If you get authentication errors:

```bash
npx vercel logout
npx vercel login
```

## Differences: Local Dev vs Production

| Feature | `npm run dev` (Local) | Production (Vercel) |
|---------|---------------------|-------------------|
| Speed | ⚡ Fast | ⚡ Fast |
| API Routes | ❌ Don't work | ✅ Work |
| Hot Reload | ✅ Yes | ❌ No (requires redeploy) |
| Environment | Local `.env.local` | Vercel env vars |
| Use Case | Frontend dev | Full testing |

## Notes

- `vercel dev` uses your production environment variables by default
- API routes execute as real serverless functions locally
- Changes to API routes require restarting the dev server
- Frontend changes hot-reload automatically

