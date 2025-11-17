#!/bin/bash
# Comprehensive cleanup script for dev processes
# Prevents port conflicts and process accumulation
# See BUGS.md BUG-006 for details

echo "🧹 Cleaning up dev processes..."

# Kill vercel dev processes
echo "🛑 Killing vercel dev processes..."
pkill -9 -f "vercel dev" 2>/dev/null
pkill -9 -f "npm exec vercel" 2>/dev/null

# Kill vite processes
echo "🛑 Killing vite processes..."
pkill -9 -f "vite" 2>/dev/null

# Free ports
echo "🛑 Freeing ports 3000 and 5173..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Wait a moment
sleep 1

# Verify cleanup
VERCEL_PROCESSES=$(ps aux | grep -E "vercel dev" | grep -v grep | wc -l | tr -d ' ')
VITE_PROCESSES=$(ps aux | grep -E "vite" | grep -v grep | wc -l | tr -d ' ')
PORT_3000=$(lsof -ti:3000 2>/dev/null | wc -l | tr -d ' ')
PORT_5173=$(lsof -ti:5173 2>/dev/null | wc -l | tr -d ' ')

if [ "$VERCEL_PROCESSES" -eq 0 ] && [ "$VITE_PROCESSES" -eq 0 ] && [ "$PORT_3000" -eq 0 ] && [ "$PORT_5173" -eq 0 ]; then
    echo "✅ All dev processes cleaned up"
    echo "✅ Ports 3000 and 5173 are free"
    exit 0
else
    echo "⚠️  Warning: Some processes or ports may still be in use:"
    [ "$VERCEL_PROCESSES" -gt 0 ] && echo "   - $VERCEL_PROCESSES vercel process(es) still running"
    [ "$VITE_PROCESSES" -gt 0 ] && echo "   - $VITE_PROCESSES vite process(es) still running"
    [ "$PORT_3000" -gt 0 ] && echo "   - Port 3000 still in use"
    [ "$PORT_5173" -gt 0 ] && echo "   - Port 5173 still in use"
    exit 1
fi




