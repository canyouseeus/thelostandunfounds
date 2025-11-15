#!/bin/bash

# Reset Newsletter Subscribers List
# Usage: ./scripts/reset-newsletter-list.sh [admin-secret]

set -e

# Get admin secret from argument or environment variable
ADMIN_SECRET="${1:-${RESET_NEWSLETTER_SECRET:-${ADMIN_SECRET_KEY}}}"
API_URL="${API_URL:-https://www.thelostandunfounds.com}"

if [ -z "$ADMIN_SECRET" ]; then
  echo "Error: Admin secret required"
  echo "Usage: $0 [admin-secret]"
  echo "Or set RESET_NEWSLETTER_SECRET or ADMIN_SECRET_KEY environment variable"
  exit 1
fi

echo "Resetting newsletter subscribers list..."
echo "API URL: $API_URL"

RESPONSE=$(curl -s -X POST \
  "$API_URL/api/admin/reset-newsletter-list" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d "{\"secret\": \"$ADMIN_SECRET\"}")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo ""
  echo "✅ Newsletter list reset successfully!"
else
  echo ""
  echo "❌ Failed to reset newsletter list"
  exit 1
fi
