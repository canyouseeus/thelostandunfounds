#!/bin/bash
# Audit API Routes - Ensures local-server.js and api/ directory are in sync
# Run this before deployments to catch missing production routes

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_SERVER="$PROJECT_DIR/local-server.js"
API_DIR="$PROJECT_DIR/api"

echo "=========================================="
echo "  API ROUTE PARITY AUDIT"
echo "=========================================="
echo ""

# Extract routes from local-server.js
echo "📋 Routes in local-server.js:"
echo "-------------------------------------------"

LOCAL_ROUTES=$(grep -oE "pathname === '/api/[^']+'" "$LOCAL_SERVER" | sed "s/pathname === '//" | sed "s/'$//" | sort -u)

echo "$LOCAL_ROUTES" | while read -r route; do
    echo "  $route"
done

echo ""
echo "📁 Files in api/ directory:"
echo "-------------------------------------------"

# Find all TypeScript files in api/ and convert to route paths
find "$API_DIR" -name "*.ts" -type f | while read -r file; do
    # Convert file path to route
    relative="${file#$API_DIR}"
    # Remove .ts extension
    route="${relative%.ts}"
    # Handle [...path].ts as catch-all
    if [[ "$route" == *"[...path]"* ]]; then
        parent=$(dirname "$route")
        echo "  /api$parent/* (catch-all)"
    elif [[ "$route" == *"["* ]]; then
        # Dynamic route
        echo "  /api$route (dynamic)"
    else
        echo "  /api$route"
    fi
done

echo ""
echo "=========================================="
echo "  CHECKING FOR MISSING PRODUCTION ROUTES"
echo "=========================================="
echo ""

MISSING_COUNT=0

echo "$LOCAL_ROUTES" | while read -r route; do
    # Convert route to expected file path
    # /api/admin/analytics/record -> api/admin/analytics/record.ts
    file_path="${route#/}"  # Remove leading slash
    file_path="$PROJECT_DIR/$file_path.ts"
    
    # Check if file exists directly
    if [[ -f "$file_path" ]]; then
        echo "✅ $route -> $(basename "$file_path")"
    else
        # Check for catch-all handler in parent directories
        parent_dir=$(dirname "$file_path")
        found_handler=false
        
        while [[ "$parent_dir" != "$PROJECT_DIR" && "$parent_dir" != "/" ]]; do
            # Check for [...path].ts in parent
            if [[ -f "$parent_dir/[...path].ts" ]]; then
                echo "✅ $route -> [...path].ts (catch-all in $(basename "$parent_dir"))"
                found_handler=true
                break
            fi
            parent_dir=$(dirname "$parent_dir")
        done
        
        if [[ "$found_handler" == false ]]; then
            echo "❌ MISSING: $route"
            echo "   Expected: $file_path"
            MISSING_COUNT=$((MISSING_COUNT + 1))
        fi
    fi
done

echo ""
echo "=========================================="

# Count missing by running again with wc
MISSING_TOTAL=$(echo "$LOCAL_ROUTES" | while read -r route; do
    file_path="${route#/}"
    file_path="$PROJECT_DIR/$file_path.ts"
    
    if [[ ! -f "$file_path" ]]; then
        parent_dir=$(dirname "$file_path")
        found=false
        while [[ "$parent_dir" != "$PROJECT_DIR" && "$parent_dir" != "/" ]]; do
            if [[ -f "$parent_dir/[...path].ts" ]]; then
                found=true
                break
            fi
            parent_dir=$(dirname "$parent_dir")
        done
        if [[ "$found" == false ]]; then
            echo "missing"
        fi
    fi
done | wc -l | tr -d ' ')

if [[ "$MISSING_TOTAL" -gt 0 ]]; then
    echo ""
    echo "⚠️  WARNING: $MISSING_TOTAL route(s) exist in local-server.js but NOT in api/"
    echo "   These will 404 in production!"
    echo ""
    echo "To fix: Create the corresponding .ts file in the api/ directory"
    echo "See: .agent/workflows/api-route-development.md for templates"
    echo ""
    exit 1
else
    echo ""
    echo "✅ All routes are synced between local-server.js and api/"
    echo ""
    exit 0
fi
