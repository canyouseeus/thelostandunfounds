#!/bin/bash

# Discord Integration Test Script
# Tests all Discord endpoints after deployment

BASE_URL="https://thelostandunfounds.com"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Discord Integration Endpoints"
echo "========================================"
echo ""

# Test 1: Webhook Health Check
echo "1️⃣  Testing Webhook Endpoint (GET)..."
WEBHOOK_RESPONSE=$(curl -s "$BASE_URL/api/discord/webhook")
if echo "$WEBHOOK_RESPONSE" | grep -q "Discord webhook endpoint is active"; then
  echo -e "${GREEN}✅ Webhook endpoint is active${NC}"
  echo "   Response: $WEBHOOK_RESPONSE"
else
  echo -e "${RED}❌ Webhook endpoint not responding correctly${NC}"
  echo "   Response: $WEBHOOK_RESPONSE"
fi
echo ""

# Test 2: Interactions Health Check
echo "2️⃣  Testing Interactions Endpoint (GET)..."
INTERACTIONS_RESPONSE=$(curl -s "$BASE_URL/api/discord/interactions")
if echo "$INTERACTIONS_RESPONSE" | grep -q "Discord interactions endpoint is active"; then
  echo -e "${GREEN}✅ Interactions endpoint is active${NC}"
  echo "   Response: $INTERACTIONS_RESPONSE"
else
  echo -e "${RED}❌ Interactions endpoint not responding correctly${NC}"
  echo "   Response: $INTERACTIONS_RESPONSE"
fi
echo ""

# Test 3: OAuth Endpoint (should redirect)
echo "3️⃣  Testing OAuth Endpoint (GET)..."
OAUTH_RESPONSE=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE_URL/api/discord/oauth")
if [ "$OAUTH_RESPONSE" = "302" ] || [ "$OAUTH_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ OAuth endpoint is responding${NC}"
  echo "   HTTP Status: $OAUTH_RESPONSE"
else
  echo -e "${YELLOW}⚠️  OAuth endpoint returned: $OAUTH_RESPONSE${NC}"
  echo "   (This might be expected if environment variables aren't set)"
fi
echo ""

# Test 4: Webhook POST (if webhook URL is configured)
echo "4️⃣  Testing Webhook POST (sending test message)..."
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}⚠️  DISCORD_WEBHOOK_URL not set - skipping webhook POST test${NC}"
  echo "   Set this environment variable to test sending messages"
else
  WEBHOOK_POST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/discord/webhook" \
    -H "Content-Type: application/json" \
    -d '{
      "content": "🧪 Test message from integration test",
      "embeds": [{
        "title": "Integration Test",
        "description": "Discord integration is working!",
        "color": 65280
      }]
    }')
  
  if echo "$WEBHOOK_POST_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Webhook POST successful${NC}"
    echo "   Response: $WEBHOOK_POST_RESPONSE"
  else
    echo -e "${RED}❌ Webhook POST failed${NC}"
    echo "   Response: $WEBHOOK_POST_RESPONSE"
  fi
fi
echo ""

echo "========================================"
echo "📋 Next Steps:"
echo "1. Register slash commands: npm run discord:register-commands"
echo "2. Test bot commands in your Discord server"
echo "3. Check Discord Developer Portal → Interactions URL"
echo "   Should be: $BASE_URL/api/discord/interactions"
echo ""
