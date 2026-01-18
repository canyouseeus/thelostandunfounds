#!/bin/bash

# Disable history expansion
set +H

echo "=============================================="
echo "  UPDATE VERCEL (PRODUCTION) SECRETS"
echo "=============================================="
echo "This will update the keys used by your LIVE website."
echo "You will be prompted to paste values."
echo ""

# 1. Update Client ID
echo "👉 1. Enter valid PAYPAL_CLIENT_ID:"
read -r CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    echo "Skipping Client ID update..."
else
    echo "Updating PAYPAL_CLIENT_ID on Vercel..."
    # We pipe the value into the command to avoid interactive prompts if possible, 
    # but 'vercel env add' is interactive. We'll verify if we can pass it via stdin or args.
    # Standard 'vercel env add' asks for value -> target environments.
    # We can use 'printf' to simulate inputs: value -> Production (y) -> Preview (y) -> Dev (y)
    
    # Actually, simpler to just run the command and let user interact, 
    # but we can try to make it smoother.
    # Let's just run the command directly so they can select 'Production'.
    echo "$CLIENT_ID" | npx vercel env add PAYPAL_CLIENT_ID production
fi

# 2. Update Client Secret
echo ""
echo "👉 2. Enter valid PAYPAL_CLIENT_SECRET (Input hidden):"
read -s CLIENT_SECRET

if [ -z "$CLIENT_SECRET" ]; then
    echo "Skipping Secret update..."
else
    echo "Updating PAYPAL_CLIENT_SECRET on Vercel..."
    echo "$CLIENT_SECRET" | npx vercel env add PAYPAL_CLIENT_SECRET production
fi

# 3. Secure Environment Mode
echo ""
echo "👉 3. Setting Environment to LIVE..."
echo "LIVE" | npx vercel env add PAYPAL_ENVIRONMENT production

echo ""
echo "=============================================="
echo "  ✅ SECRETS UPDATED"
echo "=============================================="
echo "🚀 IMPORTANT: You MUST Redeploy for these to take effect."
echo "   Running 'npx vercel --prod' now..."
echo "=============================================="

npx vercel --prod
