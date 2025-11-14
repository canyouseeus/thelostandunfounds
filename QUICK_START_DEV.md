# Quick Start - Development Server

## Simple Instructions

1. **Check if Node.js is installed:**
   ```bash
   node --version
   npm --version
   ```

2. **If not installed, install Node.js:**
   ```bash
   # macOS (using Homebrew)
   brew install node
   
   # Or download from: https://nodejs.org/
   ```

3. **Navigate to project directory:**
   ```bash
   cd /workspace
   # or wherever your project is located
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   - Main site: http://localhost:3000
   - Shop page: http://localhost:3000/shop
   - Settings: http://localhost:3000/settings

## Troubleshooting

**If npm command not found:**
- Install Node.js first (see step 2)

**If port 3000 is already in use:**
- The server will try the next available port
- Check the terminal output for the actual URL

**If environment variables are missing:**
- Copy `.env.example` to `.env.local`
- Add your `FOURTHWALL_STOREFRONT_TOKEN` if you have it

**If there are dependency errors:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
