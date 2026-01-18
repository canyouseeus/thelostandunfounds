---
description: Robustly restart the local development server by cleaning cache and killing stale processes.
---

# Fix Dev Server Skill

This skill provides a robust way to restart the local development server when it encounters 500 errors or becomes unresponsive.

## Usage

Run this skill when:
- The local server returns 500 Internal Server Errors.
- The server is unresponsive.
- You need a clean restart after modifying config files.

## Steps

1.  **Kill Existing Processes**: Forcefully kill any running `npm run dev` or `vite` processes.
2.  **Clean Cache**: Remove `node_modules/.vite` to clear Vite's dependency cache.
3.  **Restart Server**: Start the server again using `npm run dev:full` (or appropriate script).
4.  **Verify**: Check that the server returns a 200 response.

## Script: `fix-server.sh`

Create and run this script to perform the fix:

```bash
#!/bin/bash

echo "🛑 Killing existing dev processes..."
pkill -f "vite" || true
pkill -f "next" || true
pkill -f "npm run dev" || true

echo "🧹 Cleaning Vite cache..."
rm -rf node_modules/.vite
rm -rf .next

echo "🚀 Starting development server..."
# Run in background and save PID
npm run dev &
PID=$!

echo "⏳ Waiting for server to start..."
# Loop to check if server is up
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Server is UP!"
        exit 0
    fi
    sleep 2
done

echo "❌ Server failed to start within 60 seconds."
exit 1
```
