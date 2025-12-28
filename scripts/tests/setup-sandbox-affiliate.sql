-- Sandbox affiliate + product cost seed
-- Use in Supabase SQL editor for sandbox testing
-- Replace values in <> before running

-- 1) Affiliate record (idempotent)
INSERT INTO affiliates (id, user_id, code, status, commission_rate, payment_threshold, paypal_email, total_earnings, total_clicks, total_conversions, total_mlm_earnings)
VALUES (
  coalesce((SELECT id FROM affiliates WHERE code = '<SANDBOX_CODE>'),
           gen_random_uuid()),
  '<USER_UUID>',
  '<SANDBOX_CODE>',
  'active',
  25.00,              -- 25% commission
  1.00,               -- $1 minimum payout
  '<sandbox-buyer@personal.example.com>',
  0,
  0,
  0,
  0
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  commission_rate = EXCLUDED.commission_rate,
  payment_threshold = EXCLUDED.payment_threshold,
  paypal_email = EXCLUDED.paypal_email;

-- 2) Product cost row for profit math (idempotent)
INSERT INTO product_costs (product_id, variant_id, cost, source)
VALUES ('<PRODUCT_ID>', '<VARIANT_ID_OR_EMPTY>', 4.00, 'local')
ON CONFLICT (product_id, variant_id, source) DO UPDATE SET
  cost = EXCLUDED.cost;

-- 3) Optional: reset affiliate earnings for a clean test
UPDATE affiliates
SET total_earnings = 0,
    total_clicks = 0,
    total_conversions = 0,
    total_mlm_earnings = 0
WHERE code = '<SANDBOX_CODE>';

-- 4) Cleanup pending payouts for this affiliate (optional)
DELETE FROM payout_requests
WHERE affiliate_id = (SELECT id FROM affiliates WHERE code = '<SANDBOX_CODE>')
  AND status IN ('pending', 'processing');

