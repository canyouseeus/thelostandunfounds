# Agent Prompt: Start Development Server

**Copy this entire prompt to another agent:**

---

I need you to start the React/Vite development server for my project located at `/workspace`. Please follow these steps **thoroughly** and report back on each step.

## Task: Start Development Server

### Step 1: Verify Prerequisites
1. Check current directory: Run `pwd` - should be `/workspace`
2. Verify Node.js: Run `node --version` - report the version or if it's missing
3. Verify npm: Run `npm --version` - report the version or if it's missing
4. If Node.js/npm are missing, install them first (on macOS: `brew install node`)

### Step 2: Verify Project Structure
1. List files: Run `ls -la` and confirm you see `package.json`, `vite.config.ts`, `src/`, `public/`
2. Check if dependencies are installed: Run `ls node_modules` - report if it exists or not

### Step 3: Install Dependencies (if needed)
1. If `node_modules` doesn't exist or is incomplete, run: `npm install`
2. Wait for completion and report any errors
3. Verify installation: Check that `node_modules/react` and `node_modules/vite` exist

### Step 4: Check Environment Variables
1. Check if `.env.local` exists: Run `ls -la .env.local`
2. If missing, create it: Run `cp .env.example .env.local` (if .env.example exists)
3. Report what environment variables are present (don't show actual values, just names)

### Step 5: Start the Development Server
1. Check if port 3000 is in use: Run `lsof -ti:3000` - report if port is available
2. Start server: Run `npm run dev`
3. **Wait for server to start** - look for output like "ready in xxx ms" and "Local: http://localhost:3000"
4. Report the exact URL shown in the terminal

### Step 6: Verify Server is Running
1. In a NEW terminal (keep dev server running), test: `curl http://localhost:3000 | head -20`
2. Test shop API: `curl http://localhost:3000/api/fourthwall/products | head -20`
3. Test shop page: `curl http://localhost:3000/shop | head -20`
4. Report if each endpoint responds successfully

### Step 7: Report Results
Please provide:
- ✅ Node.js version (or ❌ not installed)
- ✅ npm version (or ❌ not installed)
- ✅ Dependencies installed (or ❌ with error message)
- ✅ Server started (or ❌ with full error output)
- ✅ Server URL (should be http://localhost:3000 or similar)
- ✅ Root page accessible (or ❌ with error)
- ✅ Shop page accessible (or ❌ with error)
- ✅ API endpoint accessible (or ❌ with error)
- Any warnings or errors encountered

### Important Notes:
- **DO NOT** stop the server after starting it - keep it running
- If you encounter errors, provide the **full error message**, not just "it failed"
- If port 3000 is in use, try to identify what's using it or use a different port
- If dependencies fail to install, try: `rm -rf node_modules package-lock.json && npm install`
- If environment variables are missing, that's okay for now - server should still start

### Expected Success Output:
When successful, the terminal should show:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

### Troubleshooting:
If the server doesn't start:
1. Check for TypeScript errors: Look for red error messages
2. Check for missing dependencies: Look for "Cannot find module" errors
3. Check port availability: Port 3000 might be in use
4. Check environment: Missing env vars might cause warnings but shouldn't block startup

Please execute these steps **one by one** and report the results of each step before proceeding to the next.

---
