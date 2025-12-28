#!/bin/bash

# Zoho Refresh Token Generator
# This script helps you get a refresh token for Zoho Mail API

echo "🔐 Zoho Mail Refresh Token Generator"
echo "===================================="
echo ""

# Get Client ID
read -p "Enter your ZOHO_CLIENT_ID (starts with 1000.): " CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
  echo "❌ Client ID is required"
  exit 1
fi

# Get Client Secret
read -p "Enter your ZOHO_CLIENT_SECRET: " CLIENT_SECRET

if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required"
  exit 1
fi

# Build authorization URL
AUTH_URL="https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.organization.READ&client_id=${CLIENT_ID}&response_type=code&redirect_uri=https://thelostandunfounds.com/auth/callback&access_type=offline"

echo ""
echo "📋 Step 1: Authorize the application"
echo "===================================="
echo ""
echo "1. Open this URL in your browser:"
echo ""
echo "   $AUTH_URL"
echo ""
echo "2. Sign in and click 'Accept' or 'Allow'"
echo ""
echo "3. After authorization, you'll be redirected to a URL like:"
echo "   https://thelostandunfounds.com/auth/callback?code=AUTHORIZATION_CODE_HERE"
echo ""
echo "4. Copy the 'code' value from the URL (the part after 'code=')"
echo ""

read -p "Paste the authorization code here: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
  echo "❌ Authorization code is required"
  exit 1
fi

echo ""
echo "🔄 Step 2: Exchanging code for refresh token..."
echo ""

# Exchange authorization code for refresh token
RESPONSE=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=https://thelostandunfounds.com/auth/callback" \
  -d "code=${AUTH_CODE}")

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Error getting refresh token:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

# Extract refresh token
REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))" 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
  echo "❌ Failed to extract refresh token from response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "✅ Success! Your refresh token:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$REFRESH_TOKEN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the refresh token above"
echo "2. Go to Vercel: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables"
echo "3. Add/edit ZOHO_REFRESH_TOKEN with the value above"
echo "4. Make sure to select all environments (Production, Preview, Development)"
echo "5. Save"
echo ""
echo "✅ Refresh token copied to clipboard!"
echo "$REFRESH_TOKEN" | pbcopy

