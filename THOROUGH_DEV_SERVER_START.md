# Thorough Development Server Start Guide

## Complete Step-by-Step Instructions

### Step 1: Verify Prerequisites

**1.1 Check current directory:**
```bash
pwd
# Should show: /workspace (or your project path)
# If not, navigate: cd /workspace
```

**1.2 Verify Node.js is installed:**
```bash
node --version
# Expected output: v18.x.x or higher (e.g., v18.17.0, v20.x.x, v22.x.x)
# If command not found, install Node.js (see Step 1.3)
```

**1.3 If Node.js is NOT installed, install it:**
```bash
# macOS (using Homebrew - recommended)
brew install node

# OR download from official site:
# Visit: https://nodejs.org/
# Download LTS version
# Install the .pkg file
# Restart terminal after installation

# Verify installation:
node --version
npm --version
```

**1.4 Verify npm is installed:**
```bash
npm --version
# Expected output: 9.x.x or higher (e.g., 9.5.0, 10.x.x)
# npm comes with Node.js, so if Node.js is installed, npm should be too
```

**1.5 Verify project files exist:**
```bash
ls -la
# Should show: package.json, vite.config.ts, src/, public/, etc.
# If not, verify you're in the correct directory
```

### Step 2: Check and Install Dependencies

**2.1 Check if node_modules exists:**
```bash
ls -la node_modules 2>/dev/null && echo "Dependencies already installed" || echo "Need to install dependencies"
```

**2.2 Install dependencies:**
```bash
npm install
# This may take 1-3 minutes depending on internet speed
# Watch for any errors in the output
```

**2.3 Verify installation completed successfully:**
```bash
# Check for common dependency folders
ls node_modules/react
ls node_modules/vite
# Both should exist without errors
```

**2.4 If npm install fails, try these fixes:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Try installing again
npm install
```

### Step 3: Set Up Environment Variables

**3.1 Check if .env.local exists:**
```bash
ls -la .env.local 2>/dev/null && echo ".env.local exists" || echo ".env.local does not exist"
```

**3.2 Create .env.local from .env.example if needed:**
```bash
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
else
    echo ".env.local already exists"
fi
```

**3.3 Verify .env.local has required variables:**
```bash
cat .env.local | grep -E "VITE_SUPABASE|FOURTHWALL"
# Should show at least:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# FOURTHWALL_STOREFRONT_TOKEN=... (optional but recommended)
```

**3.4 If variables are missing, add them:**
```bash
# Edit .env.local (use nano, vim, or your preferred editor)
nano .env.local
# Or
code .env.local
# Add any missing variables from .env.example
```

### Step 4: Start the Development Server

**4.1 Check if port 3000 is available:**
```bash
lsof -ti:3000 && echo "Port 3000 is in use" || echo "Port 3000 is available"
# If port is in use, you may need to kill the process or use a different port
```

**4.2 Start the development server:**
```bash
npm run dev
# This should start Vite dev server
# Look for output like:
# "  VITE v5.x.x  ready in xxx ms
#   ➜  Local:   http://localhost:3000/"
```

**4.3 Verify server started successfully:**
```bash
# In a NEW terminal window (keep the dev server running), test the server:
curl http://localhost:3000 2>/dev/null | head -20
# Should return HTML content, not an error
```

**4.4 Check for any startup errors:**
- Look for red error messages in the terminal
- Common issues:
  - Port already in use → Kill process or change port
  - Missing dependencies → Run `npm install` again
  - Environment variable errors → Check .env.local
  - TypeScript errors → May not block server but should be fixed

### Step 5: Verify Server is Running

**5.1 Test the root endpoint:**
```bash
curl -s http://localhost:3000 | grep -o "<title>.*</title>" || echo "Server may not be responding"
# Should show: <title>...</title> with your app name
```

**5.2 Test the shop endpoint (API):**
```bash
curl -s http://localhost:3000/api/fourthwall/products | head -50
# Should return JSON (may be empty products array if token not set, but should not error)
```

**5.3 Verify the shop page route exists:**
```bash
curl -s http://localhost:3000/shop | grep -i "shop\|product" | head -5
# Should return HTML content for the shop page
```

### Step 6: Access the Application

**6.1 Open in browser:**
- Main page: http://localhost:3000
- Shop page: http://localhost:3000/shop
- Settings page: http://localhost:3000/settings

**6.2 Verify pages load:**
- Check browser console (F12) for any errors
- Check Network tab to see if API calls are working
- Verify the shop page shows products (or a message about configuration)

### Step 7: Troubleshooting Common Issues

**Issue: "npm: command not found"**
```bash
# Solution: Install Node.js (see Step 1.3)
# Then restart your terminal
```

**Issue: "Port 3000 already in use"**
```bash
# Find and kill the process:
lsof -ti:3000 | xargs kill -9
# Or use a different port by modifying vite.config.ts
```

**Issue: "Cannot find module" errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: "Environment variable not found" warnings**
```bash
# Solution: Ensure .env.local exists and has required variables
# Check .env.example for required variables
```

**Issue: Server starts but pages show errors**
```bash
# Check browser console (F12) for specific errors
# Check terminal output for build errors
# Verify all dependencies installed correctly
```

### Step 8: Final Verification Checklist

- [ ] Node.js is installed and accessible (`node --version` works)
- [ ] npm is installed and accessible (`npm --version` works)
- [ ] Dependencies are installed (`node_modules` folder exists)
- [ ] .env.local file exists with required variables
- [ ] Development server starts without errors (`npm run dev` succeeds)
- [ ] Server responds on http://localhost:3000
- [ ] Shop page is accessible at http://localhost:3000/shop
- [ ] No critical errors in browser console
- [ ] API endpoints respond (even if empty)

### Expected Terminal Output

When `npm run dev` succeeds, you should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Success Criteria

✅ **Server is running if:**
- Terminal shows "ready in xxx ms" message
- No red error messages blocking startup
- http://localhost:3000 returns HTML content
- Browser can access the pages

❌ **Server is NOT running if:**
- Terminal shows error messages and exits
- Port is already in use and server can't start
- Dependencies are missing
- Configuration errors prevent startup

---

## Quick Reference Commands

```bash
# Full setup sequence:
cd /workspace
node --version && npm --version  # Verify prerequisites
npm install                      # Install dependencies
cp .env.example .env.local       # Setup env vars (if needed)
npm run dev                     # Start server

# Verify it's working:
curl http://localhost:3000      # Test root
curl http://localhost:3000/shop # Test shop page
```

---

## What to Report Back

After following these steps, report:
1. ✅ Node.js version (or ❌ if not installed)
2. ✅ npm version (or ❌ if not installed)
3. ✅ Dependencies installed successfully (or ❌ with error)
4. ✅ Server started successfully (or ❌ with error message)
5. ✅ Server URL (should be http://localhost:3000)
6. ✅ Shop page accessible (or ❌ with error)
7. Any errors or warnings encountered
