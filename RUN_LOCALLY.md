# Run Development Server on Your Local Mac

## The Problem
The server is running on a **remote machine** (the workspace), but your browser is on your **local Mac**. They can't connect.

## The Solution
Run the dev server **on your local Mac** instead.

## Steps to Run Locally

### 1. Open Terminal on Your Mac
- Press `Cmd + Space` and type "Terminal"
- Or go to Applications → Utilities → Terminal

### 2. Navigate to Your Project
```bash
cd /path/to/thelostandunfounds
# Replace with your actual project path
# Example: cd ~/Desktop/thelostandunfounds
# Or: cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
```

### 3. Check if Node.js is Installed
```bash
node --version
npm --version
```

If not installed:
```bash
brew install node
# Or download from: https://nodejs.org/
```

### 4. Install Dependencies (if not done)
```bash
npm install
```

### 5. Set Up Environment Variables
```bash
# Copy example file
cp .env.example .env.local

# Edit it (add your Fourthwall token if you have it)
nano .env.local
# Or use any text editor
```

### 6. Start the Server
```bash
npm run dev
```

### 7. Open in Browser
The terminal will show:
```
➜  Local:   http://localhost:3000/
```

Open that URL in your browser!

## Quick One-Liner (if everything is set up)
```bash
cd /path/to/thelostandunfounds && npm run dev
```

## Troubleshooting

**"npm: command not found"**
→ Install Node.js first: `brew install node`

**"Port 3000 already in use"**
→ Kill the process: `lsof -ti:3000 | xargs kill -9`

**"Cannot find module"**
→ Run: `npm install`

---

**The key point:** Run `npm run dev` on YOUR Mac, not in the remote workspace!
