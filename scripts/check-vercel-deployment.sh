#!/bin/bash
# Vercel Deployment Status Checker
# Usage: ./check-vercel-deployment.sh [optional: deployment-id]

PROJECT_DIR="/Users/thelostunfounds/.gemini/antigravity/scratch/thelostandunfounds"

# Load environment variables
if [ -f "$PROJECT_DIR/.env.local" ]; then
    export $(grep -E '^VERCEL_' "$PROJECT_DIR/.env.local" | xargs)
fi

# Check for required env vars
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN not found in .env.local"
    echo "   Add VERCEL_TOKEN=your_token to .env.local"
    echo "   Get your token from: https://vercel.com/account/tokens"
    exit 1
fi

# Optional: specific deployment ID or get latest
DEPLOYMENT_ID=$1

# Vercel project info (update these for your project)
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-thelostandunfounds}"

# Build API URL
if [ -n "$DEPLOYMENT_ID" ]; then
    API_URL="https://api.vercel.com/v13/deployments/$DEPLOYMENT_ID"
else
    # Get latest deployment
    if [ -n "$VERCEL_TEAM_ID" ]; then
        API_URL="https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_TEAM_ID&limit=1"
    else
        API_URL="https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1"
    fi
fi

echo "🔍 Checking Vercel deployment status..."
echo ""

# Fetch deployment status
RESPONSE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API_URL")

# Check if we got a list or single deployment
if [ -z "$DEPLOYMENT_ID" ]; then
    # Extract from list
    STATE=$(echo "$RESPONSE" | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
    URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
    CREATED=$(echo "$RESPONSE" | grep -o '"createdAt":[0-9]*' | head -1 | cut -d':' -f2)
    UID=$(echo "$RESPONSE" | grep -o '"uid":"[^"]*"' | head -1 | cut -d'"' -f4)
else
    STATE=$(echo "$RESPONSE" | grep -o '"readyState":"[^"]*"' | cut -d'"' -f4)
    URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
    UID=$DEPLOYMENT_ID
fi

# Display status with emoji
case "$STATE" in
    "READY")
        echo "✅ Deployment Status: READY"
        echo "🌐 URL: https://$URL"
        echo "🆔 Deployment ID: $UID"
        echo ""
        echo "Deployment successful!"
        ;;
    "BUILDING")
        echo "🔨 Deployment Status: BUILDING"
        echo "🆔 Deployment ID: $UID"
        echo ""
        echo "Deployment is still building..."
        ;;
    "QUEUED")
        echo "⏳ Deployment Status: QUEUED"
        echo "🆔 Deployment ID: $UID"
        echo ""
        echo "Deployment is queued..."
        ;;
    "INITIALIZING")
        echo "🔄 Deployment Status: INITIALIZING"
        echo "🆔 Deployment ID: $UID"
        echo ""
        echo "Deployment is initializing..."
        ;;
    "ERROR"|"CANCELED")
        echo "❌ Deployment Status: $STATE"
        echo "🆔 Deployment ID: $UID"
        echo ""
        echo "Deployment failed!"
        ;;
    *)
        echo "❓ Unknown status: $STATE"
        echo "Response: $RESPONSE"
        ;;
esac
