# API Routes Development Guide

## Quick Fix: Switch to API-Enabled Dev Server

### Current Issue
You're running `npm run dev` which uses Vite and **doesn't support API routes**.

### Solution: Use `npm run dev:api`

**Step 1: Stop Current Server**
- Press `Ctrl+C` in the terminal where `npm run dev` is running

**Step 2: Start API-Enabled Server**
```bash
npm run dev:api
```

**Step 3: Refresh Browser**
- Refresh the Affiliate Admin View page
- API routes should now work!

## Two Development Modes

### 1. Frontend-Only Mode (`npm run dev`)
- ✅ Fast hot reload
- ✅ Good for React component development
- ❌ API routes don't work
- Use when: Working on UI/components only

### 2. Full Stack Mode (`npm run dev:api`)
- ✅ API routes work (`/api/*` endpoints)
- ✅ Matches production behavior
- ✅ Full serverless function support
- Use when: Testing API endpoints, admin features, or full-stack functionality

## First Time Setup

If `npm run dev:api` asks you to link the project:

1. **Follow the prompts:**
   - It will ask if you want to link to an existing project
   - Select "Yes" and choose `thelostandunfounds`
   - Or select "No" to create a new project (not recommended)

2. **If linking fails:**
   ```bash
   # Link manually
   npx vercel link
   
   # Then try again
   npm run dev:api
   ```

## Troubleshooting

### "Command not found: vercel"
```bash
# Install Vercel CLI globally
npm install -g vercel

# Or use npx (no install needed)
npm run dev:api  # Uses npx vercel internally
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then start again
npm run dev:api
```

### API Routes Still Not Working
1. Check terminal for errors
2. Verify you're using `npm run dev:api` (not `npm run dev`)
3. Check browser console for errors
4. Try accessing API directly: `http://localhost:3000/api/admin/affiliates`

## Production

In production (Vercel deployment), API routes work automatically - no special setup needed!

