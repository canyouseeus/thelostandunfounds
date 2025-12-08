#!/bin/bash

# Restart Dev Server Script
# Stops any running dev server and starts the correct one with API routes support

set -e

echo "🔄 Restarting dev server..."

# Change to project directory first
cd "$(dirname "$0")/.."

# Kill any processes on port 3000
echo "📌 Checking for processes on port 3000..."
PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "🛑 Stopping existing server(s) on port 3000..."
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "✅ Server stopped"
else
    echo "ℹ️  No server running on port 3000"
fi

# Also kill any vite/vercel processes (more aggressive cleanup)
echo "🧹 Cleaning up any remaining dev processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "vercel dev" 2>/dev/null || true
sleep 1

# Wait for port to be fully released
echo "⏳ Waiting for port to be released..."
sleep 2

echo ""
echo "🚀 Starting dev server with API routes support..."
echo "   (Using: npm run dev -> vercel dev)"
echo ""
echo "📝 Note: If this is your first time, Vercel may ask you to link the project."
echo "   Select 'Yes' and choose 'thelostandunfounds'"
echo ""

# Start the dev server with API routes (use dev:api for vercel dev)
npm run dev:api

