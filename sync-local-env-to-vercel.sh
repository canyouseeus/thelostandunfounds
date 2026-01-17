#!/bin/bash

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found."
    exit 1
fi

# Extract values specifically to avoid sourcing issues
CLIENT_ID=$(grep "^PAYPAL_CLIENT_ID=" .env | cut -d '=' -f2-)
SECRET=$(grep "^PAYPAL_CLIENT_SECRET=" .env | cut -d '=' -f2-)

if [ -z "$CLIENT_ID" ] || [ -z "$SECRET" ]; then
    echo "❌ Error: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing in .env"
    exit 1
fi

echo "=============================================="
echo "  SYNC TO VERCEL"
echo "=============================================="
echo "Reading credentials from local .env file..."
echo "Client ID: ${CLIENT_ID:0:10}..."

# 0. Clean up old values first (to avoid "already exists" errors)
echo "Cleaning up old Vercel secrets..."
npx vercel env rm PAYPAL_CLIENT_ID production -y >/dev/null 2>&1 || true
npx vercel env rm PAYPAL_CLIENT_SECRET production -y >/dev/null 2>&1 || true
npx vercel env rm PAYPAL_ENVIRONMENT production -y >/dev/null 2>&1 || true

# 1. Add Client ID
echo "Uploading PAYPAL_CLIENT_ID..."
printf "$CLIENT_ID" | npx vercel env add PAYPAL_CLIENT_ID production

# 2. Add Secret
echo "Uploading PAYPAL_CLIENT_SECRET..."
printf "$SECRET" | npx vercel env add PAYPAL_CLIENT_SECRET production

# 3. Add Environment
echo "Setting PAYPAL_ENVIRONMENT to LIVE..."
printf "LIVE" | npx vercel env add PAYPAL_ENVIRONMENT production

echo "=============================================="
echo "  ✅ DONE"
echo "=============================================="
echo "Redeploying for changes to take effect..."
npx vercel --prod
