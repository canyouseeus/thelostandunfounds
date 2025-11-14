#!/bin/bash

# Manual Fourthwall API Key Setup Script
# This script helps you set up the Fourthwall API key without requiring npm

ENV_FILE=".env.local"
EXAMPLE_FILE=".env.example"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Fourthwall Shop Integration Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create .env.local from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$EXAMPLE_FILE" ]; then
        cp "$EXAMPLE_FILE" "$ENV_FILE"
        echo "✓ Created $ENV_FILE from $EXAMPLE_FILE"
    else
        touch "$ENV_FILE"
        echo "✓ Created empty $ENV_FILE"
    fi
    echo ""
fi

echo "To get your Fourthwall API key:"
echo "1. Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers"
echo "2. Enable API access (if available)"
echo "3. Copy your API key"
echo ""
read -p "Enter your Fourthwall API Key (or press Enter to skip): " api_key

if [ ! -z "$api_key" ]; then
    # Check if key already exists
    if grep -q "^FOURTHWALL_API_KEY=" "$ENV_FILE" 2>/dev/null; then
        # Update existing key
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^FOURTHWALL_API_KEY=.*|FOURTHWALL_API_KEY=${api_key}|" "$ENV_FILE"
        else
            # Linux
            sed -i "s|^FOURTHWALL_API_KEY=.*|FOURTHWALL_API_KEY=${api_key}|" "$ENV_FILE"
        fi
        echo "✓ Updated FOURTHWALL_API_KEY"
    else
        # Add new key
        echo "" >> "$ENV_FILE"
        echo "# Fourthwall Shop Integration" >> "$ENV_FILE"
        echo "FOURTHWALL_API_KEY=${api_key}" >> "$ENV_FILE"
        echo "✓ Added FOURTHWALL_API_KEY"
    fi
else
    echo "⚠ Skipped API key setup"
fi

# Set store slug
if ! grep -q "^FOURTHWALL_STORE_SLUG=" "$ENV_FILE" 2>/dev/null; then
    echo "FOURTHWALL_STORE_SLUG=thelostandunfounds-shop" >> "$ENV_FILE"
    echo "✓ Added FOURTHWALL_STORE_SLUG"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Setup complete!"
echo ""
echo "Your environment variables are in: $ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Visit your shop at: /shop"
echo "2. If products don't appear, check the browser console for errors"
echo "3. You can also manually import products from Settings → Product Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
