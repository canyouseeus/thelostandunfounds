# Google Drive MCP Server Port Conflict Fix

## Problem

The Google Drive MCP server is auto-starting from Cursor IDE and binding to port 3000, which conflicts with the React dev server. This causes the "Google Drive Authentication" page to appear instead of your React app.

## Root Cause

Cursor IDE automatically starts MCP servers configured in its settings. The Google Drive MCP server is configured to run on port 3000, which is the same port your React app uses.

## Solution

The `dev` script now automatically kills any processes on port 3000 (including Google Drive MCP servers) before starting the Vite dev server.

### What Was Changed

1. **Created `scripts/kill-port-3000.sh`** - Script that kills processes on port 3000
2. **Updated `package.json`** - Added `predev` script that runs before `dev`
3. **Added `kill-mcp` script** - Manual command to kill MCP servers if needed

### Usage

**Normal development:**
```bash
npm run dev
```
This will automatically kill any processes on port 3000 before starting.

**Manual cleanup:**
```bash
npm run kill-mcp
```
Use this if you need to manually free port 3000.

## Long-term Solution

To prevent the Google Drive MCP server from auto-starting on port 3000:

### Option 1: Change MCP Server Port (Recommended)

1. **Open Cursor Settings**
   - Go to: Cursor → Settings → Features → MCP

2. **Configure Google Drive MCP Server**
   - Find the Google Drive MCP server configuration
   - Change the port from `3000` to a different port (e.g., `3001` or `8080`)
   - Save the settings

### Option 2: Change Dev Server Port

Edit `vite.config.ts` and change the server port:
```typescript
server: {
  port: 5173, // Change from 3000 to 5173
  // ...
}
```

Then update any references to `localhost:3000` in your code/docs to `localhost:5173`.

### Option 3: Disable Auto-Start (if available)

If Cursor IDE has an option to disable auto-start for MCP servers, you can enable it. However, this might affect other MCP functionality.

## Note

The TikTok downloader's "Connect Google Drive" button should work correctly - it connects to your Railway backend API (`/api/tiktok/auth/google`), not the MCP server. The MCP server is only used by Cursor IDE for development assistance.

