#!/bin/bash

# Test Payout Request Script
# Tests the payout request endpoint with affiliate code

echo "🧪 Testing Payout Request Endpoint"
echo ""

# Test with affiliate code (for test affiliates without user_id)
echo "📤 Requesting payout for TESTKING1..."
curl -X POST "http://localhost:3000/api/affiliates/request-payout" \
  -H "Content-Type: application/json" \
  -d '{
    "affiliateCode": "TESTKING1",
    "amount": 100.00
  }'

echo ""
echo ""
echo "✅ Test complete!"



