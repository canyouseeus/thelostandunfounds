# Restart Dev Server

## Quick Restart Script

I've created a script to restart your dev server with API routes support.

### Option 1: Use the npm script (Recommended)
```bash
npm run restart-dev
```

### Option 2: Run the script directly
```bash
./scripts/restart-dev.sh
```

## What the Script Does

1. ✅ Stops any existing server on port 3000
2. ✅ Starts `npm run dev` (which uses `vercel dev` with API routes)
3. ✅ Shows status messages

## First Time Setup

If this is your first time running `vercel dev`, it may ask you to:

1. **Link to existing project?** → Select **Yes**
2. **Which project?** → Select **thelostandunfounds**
3. **Which directory?** → Press Enter (current directory)

After linking, the server will start automatically.

## Manual Restart (if script doesn't work)

```bash
# Stop current server
lsof -ti:3000 | xargs kill -9

# Start new server
npm run dev
```

## Verify It's Working

1. Check terminal output - should see "Vercel CLI" messages
2. Visit: http://localhost:3000
3. Try the Affiliate Admin View - should load without errors

## Troubleshooting

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Vercel not linked:**
```bash
npx vercel link
npm run dev
```

**Want faster frontend-only mode:**
```bash
npm run dev:vite
```
(Note: API routes won't work in this mode)

