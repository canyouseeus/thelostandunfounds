#!/bin/bash
# Run development server for MANTIS version
# Usage: ./scripts/dev-mantis.sh or npm run dev:mantis

set -e

cd "$(dirname "$0")/.."

echo "🦗 MANTIS Version - Starting Development Server"
echo "================================================"

# Check if we're on MANTIS tag/commit
CURRENT_COMMIT=$(git rev-parse HEAD)
MANTIS_COMMIT=$(git rev-parse MANTIS^{commit} 2>/dev/null || echo "")

if [ -z "$MANTIS_COMMIT" ]; then
  echo "⚠️  MANTIS tag not found. Creating it..."
  git tag -a MANTIS -m "MANTIS Version" 2>/dev/null || echo "Tag may already exist"
  MANTIS_COMMIT=$(git rev-parse HEAD)
fi

# Check if we need to checkout MANTIS
if [ "$CURRENT_COMMIT" != "$MANTIS_COMMIT" ]; then
  echo "📦 Checking out MANTIS version..."
  git checkout MANTIS 2>/dev/null || git checkout "$MANTIS_COMMIT"
fi

echo "✅ MANTIS version loaded"
echo "🚀 Starting development server..."
echo ""

# Kill any processes on port 3000
./scripts/kill-port-3000.sh

# Start Vite dev server
npm run dev




