#!/bin/bash

# Default email provided by user
DEFAULT_EMAIL="the-gallery-agent@the-lost-and-unf-1737406545588.iam.gserviceaccount.com"

echo "=============================================="
echo "  SWITCH GOOGLE SERVICE ACCOUNT"
echo "=============================================="
echo "This script will update your Google Credentials for:"
echo "1. Local Environment (.env.local)"
echo "2. Vercel Production Environment"
echo ""

# 1. Get Email
echo "👉 Enter Service Account Email (Press Enter for default):"
echo "Default: $DEFAULT_EMAIL"
read -r INPUT_EMAIL
GOOGLE_EMAIL="${INPUT_EMAIL:-$DEFAULT_EMAIL}"

# 2. Get Private Key
echo ""
echo "👉 Paste the ENTIRE 'private_key' string from your JSON key file."
echo "   (It starts with -----BEGIN PRIVATE KEY----- and includes \\n characters)"
echo "   Input is hidden. Paste and press Enter:"
read -s GOOGLE_KEY

if [ -z "$GOOGLE_KEY" ]; then
    echo "❌ Error: Private Key cannot be empty."
    exit 1
fi

echo ""
echo "=============================================="
echo "  Updating Environments..."
echo "=============================================="

# Update .env.local
# We use a temporary file to avoid issues with sed and newlines in keys
if [ -f .env.local ]; then
    grep -v "GOOGLE_SERVICE_ACCOUNT_EMAIL" .env.local > .env.local.tmp
    grep -v "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY" .env.local.tmp > .env.local
    rm .env.local.tmp
fi

echo "GOOGLE_SERVICE_ACCOUNT_EMAIL=\"$GOOGLE_EMAIL\"" >> .env.local
echo "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=\"$GOOGLE_KEY\"" >> .env.local
echo "✅ Updated .env.local"

# Update Vercel
echo "⏳ Updating Vercel Production..."
echo -n "$GOOGLE_EMAIL" | npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
echo -n "$GOOGLE_KEY" | npx vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production

echo ""
echo "=============================================="
echo "  ✅ UPDATE COMPLETE"
echo "=============================================="
echo "Please redeploy for changes to take effect on the live site."
