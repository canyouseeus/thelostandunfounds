#!/bin/bash
# Kill any processes using port 3000 (especially Google Drive MCP server)
# This prevents conflicts with the React dev server

PORT=3000

# Find processes using port 3000
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ Port $PORT is free"
    exit 0
fi

echo "🔍 Found processes using port $PORT:"
lsof -ti:$PORT | xargs ps -p | grep -v PID

# Kill Google Drive MCP processes specifically
echo "🛑 Killing Google Drive MCP processes..."
pkill -f "google-drive-mcp" 2>/dev/null

# Also kill any remaining processes on port 3000
if [ ! -z "$PIDS" ]; then
    echo "🛑 Killing remaining processes on port $PORT..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    sleep 1
fi

# Verify port is free
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "⚠️  Warning: Port $PORT is still in use"
    exit 1
else
    echo "✅ Port $PORT is now free"
    exit 0
fi

