#!/bin/bash

# Zoho Refresh Token Generator
# Gets a refresh token for the Zoho Mail API.
# The client secret is hidden as you type, and the refresh token is copied
# to your clipboard instead of being printed.

REDIRECT_URI="https://thelostandunfounds.com/auth/callback"

echo "🔐 Zoho Mail Refresh Token Generator"
echo "===================================="
echo ""

read -p "Enter your ZOHO_CLIENT_ID (starts with 1000.): " CLIENT_ID
if [ -z "$CLIENT_ID" ]; then
  echo "❌ Client ID is required"
  exit 1
fi

read -s -p "Enter your ZOHO_CLIENT_SECRET (hidden): " CLIENT_SECRET
echo ""
if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required"
  exit 1
fi

AUTH_URL="https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.organization.READ&client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&access_type=offline&prompt=consent"

echo ""
echo "📋 Step 1: Authorize the application"
echo "===================================="
echo ""
echo "1. Open this URL in your browser:"
echo ""
echo "   $AUTH_URL"
echo ""
echo "2. Sign in and click 'Accept'."
echo ""
echo "3. The site will send you on to another page. Press Cmd+Y, right-click the"
echo "   newest thelostandunfounds.com entry ('Not Found'), choose Copy link address."
echo ""
echo "4. Paste that whole link below (or just the code). The code expires in about 2 minutes."
echo ""

read -s -p "Paste the callback link or code (hidden): " AUTH_INPUT
echo ""

if [ -z "$AUTH_INPUT" ]; then
  echo "❌ Authorization code is required"
  exit 1
fi

# Accept either the full callback URL or the bare code.
if [[ "$AUTH_INPUT" == *"code="* ]]; then
  AUTH_CODE="${AUTH_INPUT#*code=}"
  AUTH_CODE="${AUTH_CODE%%&*}"
else
  AUTH_CODE="$AUTH_INPUT"
fi

echo ""
echo "🔄 Step 2: Exchanging code for refresh token..."
echo ""

RESPONSE=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=${CLIENT_ID}" \
  --data-urlencode "client_secret=${CLIENT_SECRET}" \
  --data-urlencode "redirect_uri=${REDIRECT_URI}" \
  --data-urlencode "code=${AUTH_CODE}")

# Show only the error message, never tokens.
if echo "$RESPONSE" | grep -q '"error"'; then
  ERR=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'unknown error'))" 2>/dev/null)
  echo "❌ Zoho returned an error: ${ERR:-unknown error}"
  echo "   If it says invalid_code, the code expired. Run the script again and be quicker."
  exit 1
fi

REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))" 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
  echo "❌ No refresh token in Zoho's response."
  exit 1
fi

if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$REFRESH_TOKEN" | pbcopy
  echo "✅ Refresh token copied to your clipboard (not shown)."
else
  echo "✅ Got a refresh token, but pbcopy isn't available to copy it."
  read -p "Show it on screen? (y/N): " SHOW
  if [[ "$SHOW" == "y" || "$SHOW" == "Y" ]]; then
    echo "$REFRESH_TOKEN"
  fi
fi

unset CLIENT_SECRET REFRESH_TOKEN RESPONSE AUTH_CODE AUTH_INPUT

echo ""
echo "📋 Next: paste it into ZOHO_REFRESH_TOKEN in Vercel (Sensitive), then redeploy."
