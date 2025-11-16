#!/bin/bash
# Development server startup script
# Kills any processes on port 3000 before starting Vite

cd "$(dirname "$0")/.."

# Kill processes on port 3000
./scripts/kill-port-3000.sh

# Start Vite dev server
exec npm run vite-dev

