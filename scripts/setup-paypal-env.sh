#!/bin/bash
# PayPal Environment Variables Setup Script
# Usage: ./scripts/setup-paypal-env.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🔐 PayPal Environment Setup"
echo "   This script securely saves credentials to .env.local"
echo "   These values are NOT shared in the chat."
echo ""

# PAYPAL_ACCESS_TOKEN
echo "📝 PAYPAL_ACCESS_TOKEN"
echo "   Get from: Run 'node generate-paypal-token.js'"
read -p "Enter PAYPAL_ACCESS_TOKEN: " PAYPAL_ACCESS_TOKEN_INPUT
PAYPAL_ACCESS_TOKEN_VALUE="${PAYPAL_ACCESS_TOKEN_INPUT}"

if [ -z "$PAYPAL_ACCESS_TOKEN_VALUE" ]; then
  echo "❌ Error: PAYPAL_ACCESS_TOKEN cannot be empty"
  exit 1
fi

# PAYPAL_ENVIRONMENT
echo ""
echo "📝 PAYPAL_ENVIRONMENT"
echo "   Values: PRODUCTION (default) or SANDBOX"
read -p "Enter PAYPAL_ENVIRONMENT (or press Enter for PRODUCTION): " PAYPAL_ENVIRONMENT_INPUT
PAYPAL_ENVIRONMENT_VALUE="${PAYPAL_ENVIRONMENT_INPUT:-PRODUCTION}"

# Build env file content
ENV_CONTENT="# PayPal Configuration
PAYPAL_ACCESS_TOKEN=$PAYPAL_ACCESS_TOKEN_VALUE
PAYPAL_ENVIRONMENT=$PAYPAL_ENVIRONMENT_VALUE
"

# Append to .env.local
if [ -f .env.local ]; then
  # Remove existing entries to verify we don't duplicate
  grep -v "^PAYPAL_ACCESS_TOKEN=" .env.local | grep -v "^PAYPAL_ENVIRONMENT=" > .env.local.tmp || true
  mv .env.local.tmp .env.local
fi

echo -e "$ENV_CONTENT" >> .env.local

echo ""
echo "✅ PayPal environment variables added to .env.local!"
echo "   File: $PROJECT_DIR/.env.local"
echo ""
echo "👉 If the MCP server is watching this folder, restart it now."
echo "👉 If it still fails, you can copy the values from .env.local to the MCP settings UI."
