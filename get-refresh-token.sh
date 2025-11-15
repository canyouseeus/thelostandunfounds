#!/bin/bash

# Quick script to get Zoho refresh token
# Usage: ./get-refresh-token.sh YOUR_CLIENT_ID YOUR_CLIENT_SECRET AUTHORIZATION_CODE

CLIENT_ID=$1
CLIENT_SECRET=$2
AUTH_CODE=$3

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$AUTH_CODE" ]; then
  echo "Usage: ./get-refresh-token.sh CLIENT_ID CLIENT_SECRET AUTHORIZATION_CODE"
  exit 1
fi

echo "🔄 Exchanging authorization code for refresh token..."
echo ""

RESPONSE=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=https://thelostandunfounds.com/auth/callback" \
  -d "code=${AUTH_CODE}")

REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('refresh_token', ''))" 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
  echo "❌ Error:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "✅ Refresh Token:"
echo ""
echo "$REFRESH_TOKEN"
echo ""
echo "$REFRESH_TOKEN" | pbcopy
echo "✅ Copied to clipboard!"

