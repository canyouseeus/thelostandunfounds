# Vercel Dev Setup Guide

## Quick Start

To run the development server with full API route support (including Fourthwall shop):

```bash
npm run dev:api
```

This will:
- Start Vercel's local development server
- Execute API routes as serverless functions locally
- Allow you to test the Fourthwall shop integration locally
- Use your production environment variables from Vercel

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

## Differences: `npm run dev` vs `npm run dev:api`

| Feature | `npm run dev` (Vite) | `npm run dev:api` (Vercel) |
|---------|---------------------|---------------------------|
| Speed | ⚡ Faster | 🐢 Slower (runs serverless functions) |
| API Routes | ❌ Don't work | ✅ Work |
| Hot Reload | ✅ Yes | ✅ Yes |
| Environment | Local `.env.local` | Vercel production env |
| Use Case | Frontend dev | Full-stack testing |

## Notes

- `vercel dev` uses your production environment variables by default
- API routes execute as real serverless functions locally
- Changes to API routes require restarting the dev server
- Frontend changes hot-reload automatically

