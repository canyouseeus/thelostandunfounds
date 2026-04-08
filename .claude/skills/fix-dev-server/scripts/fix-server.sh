#!/bin/bash

# Fix Dev Server Script
# Usage: ./fix-server.sh

echo "🛑 Killing existing dev processes..."
pkill -f "vite" || true
pkill -f "next" || true
pkill -f "npm run dev" || true

echo "🧹 Cleaning Vite cache..."
rm -rf node_modules/.vite
rm -rf .next

echo "🚀 Starting development server..."
# Run in background
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
echo "Check logs for details."
exit 1
