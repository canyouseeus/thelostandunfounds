#!/bin/bash
# Test newsletter email sending
# Usage: ./scripts/test-newsletter-email.sh

echo "Testing newsletter email to thelostandunfounds@gmail.com..."
echo ""

# Test the API endpoint (will work after deployment)
curl -X POST https://www.thelostandunfounds.com/api/newsletter-test \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"thelostandunfounds@gmail.com"}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "If you see HTTP Status: 200, the email was sent successfully!"
echo "Check thelostandunfounds@gmail.com inbox for the test email."
