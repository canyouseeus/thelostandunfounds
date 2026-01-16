#!/bin/bash

# Dev Parity Validation Script
# Checks for common regressions in the local development environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Starting Dev Parity Validation..."

# 1. Project Root Check
CURRENT_DIR=$(pwd)
EXPECTED_DIR="/Users/thelostunfounds/thelostandunfounds"
if [[ "$CURRENT_DIR" != "$EXPECTED_DIR" ]]; then
    echo -e "${RED}❌ ERROR: Not in project root!${NC}"
    echo "Current: $CURRENT_DIR"
    echo "Expected: $EXPECTED_DIR"
    exit 1
fi
echo -e "${GREEN}✅ Project root verified.${NC}"

# 2. package.json Script Check
if grep -q '"dev": "npm run dev:full"' package.json; then
    echo -e "${GREEN}✅ Dev script is using dev:full.${NC}"
else
    echo -e "${RED}❌ REGRESSION: Dev script is NOT using dev:full!${NC}"
    echo "This means the background server (local-server.js) won't start automatically."
fi

# 3. vite.config.ts Proxy Check
if grep -q "'/api/gallery'" vite.config.ts && grep -q "'/api/photos'" vite.config.ts; then
    echo -e "${GREEN}✅ API proxies found in vite.config.ts.${NC}"
else
    echo -e "${RED}❌ REGRESSION: Missing API proxies in vite.config.ts!${NC}"
fi

# 4. Port 3001 Check (local-server.js)
if lsof -ti:3001 >/dev/null; then
    echo -e "${GREEN}✅ Local background server (port 3001) is running.${NC}"
else
    echo -e "${YELLOW}⚠️ WARNING: Local background server is NOT running.${NC}"
    echo "Gallery thumbnails and checkout may fail."
fi

# 5. Git Status Check
if git diff --quiet; then
    echo -e "${GREEN}✅ Working directory is clean.${NC}"
else
    echo -e "${YELLOW}⚠️ WARNING: You have uncommitted changes.${NC}"
fi

echo ""
echo -e "${GREEN}✨ Parity Check Complete.${NC}"
