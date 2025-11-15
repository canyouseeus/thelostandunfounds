#!/bin/bash

# Cloudflare Turnstile Key Rotation Script
# Automatically rotates Turnstile secret key and updates Supabase Edge Functions secrets

set -e  # Exit on error

# Configuration - Set these environment variables or edit here
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-your_account_id}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-your_api_token}"
TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-your_site_key}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-nonaqhllakrckbtbawrb}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Starting Turnstile Key Rotation...${NC}"

# Step 1: Rotate the secret key via Cloudflare API
echo -e "${YELLOW}Step 1: Rotating secret key via Cloudflare API...${NC}"

RESPONSE=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/challenges/widgets/${TURNSTILE_SITE_KEY}/rotate_secret" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"invalidate_immediately": false}')

# Check if API call was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Secret key rotated successfully${NC}"
else
  echo -e "${RED}❌ Failed to rotate secret key${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

# Extract the new secret key from the response
NEW_SECRET=$(echo "$RESPONSE" | grep -o '"secret":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_SECRET" ]; then
  echo -e "${RED}❌ Failed to extract new secret key from response${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ New secret key obtained${NC}"

# Step 2: Update Supabase Edge Functions secret
echo -e "${YELLOW}Step 2: Updating Supabase Edge Functions secret...${NC}"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
  exit 1
fi

# Use npx if supabase command not found globally
SUPABASE_CMD="supabase"
if ! command -v supabase &> /dev/null; then
  SUPABASE_CMD="npx supabase"
fi

# Update the secret in Supabase
if $SUPABASE_CMD secrets set TURNSTILE_SECRET_KEY="${NEW_SECRET}" --project-ref "${SUPABASE_PROJECT_REF}"; then
  echo -e "${GREEN}✅ Supabase secret updated successfully${NC}"
else
  echo -e "${RED}❌ Failed to update Supabase secret${NC}"
  exit 1
fi

# Step 3: Verify the update
echo -e "${YELLOW}Step 3: Verifying secret update...${NC}"

if $SUPABASE_CMD secrets list --project-ref "${SUPABASE_PROJECT_REF}" | grep -q "TURNSTILE_SECRET_KEY"; then
  echo -e "${GREEN}✅ Secret verified in Supabase${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Could not verify secret in Supabase${NC}"
fi

echo -e "${GREEN}🎉 Key rotation completed successfully!${NC}"
echo -e "${YELLOW}Note: Old secret key remains valid for 2 hours (grace period)${NC}"

