-- ============================================
-- SET PAYPAL EMAILS FOR TEST AFFILIATES
-- ============================================
-- Run this to set PayPal emails for test affiliates (for testing payouts)

-- Update PayPal emails for test affiliates
UPDATE affiliates
SET paypal_email = 'test-king1@example.com'
WHERE code = 'TESTKING1';

UPDATE affiliates
SET paypal_email = 'test-king3@example.com'
WHERE code = 'TESTKING3';

UPDATE affiliates
SET paypal_email = 'test-mid2@example.com'
WHERE code = 'TESTMID2';

-- Verify the updates
SELECT 
  code,
  total_earnings,
  payment_threshold,
  paypal_email,
  CASE 
    WHEN paypal_email IS NULL OR paypal_email = '' THEN '❌ No PayPal email'
    WHEN total_earnings < payment_threshold THEN CONCAT('❌ Need $', (payment_threshold - total_earnings)::text, ' more')
    ELSE '✅ Eligible for Payout'
  END as payout_status
FROM affiliates
WHERE code IN ('TESTKING1', 'TESTKING3', 'TESTMID2')
ORDER BY total_earnings DESC;

