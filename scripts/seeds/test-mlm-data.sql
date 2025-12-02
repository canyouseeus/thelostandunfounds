-- Test data with MLM referral chains
-- Creates a realistic referral network for testing

-- Create referral chain: KING01 -> PRO01 -> MID01 -> NEW01
-- KING01 has no referrer (top of chain)
-- PRO01 referred by KING01
-- MID01 referred by PRO01  
-- NEW01 referred by MID01

-- Update affiliates to create referral chain
UPDATE affiliates
SET referred_by = (SELECT id FROM affiliates WHERE affiliate_code = 'KING01')
WHERE affiliate_code IN ('PRO01', 'PRO02', 'PRO03');

UPDATE affiliates
SET referred_by = (SELECT id FROM affiliates WHERE affiliate_code = 'PRO01')
WHERE affiliate_code IN ('MID01', 'MID02', 'MID03');

UPDATE affiliates
SET referred_by = (SELECT id FROM affiliates WHERE affiliate_code = 'MID01')
WHERE affiliate_code IN ('NEW01', 'NEW02', 'NEW03');

-- Create another chain: KING02 -> PRO04 -> MID04
UPDATE affiliates
SET referred_by = (SELECT id FROM affiliates WHERE affiliate_code = 'KING02')
WHERE affiliate_code IN ('PRO04', 'PRO05');

UPDATE affiliates
SET referred_by = (SELECT id FROM affiliates WHERE affiliate_code = 'PRO04')
WHERE affiliate_code IN ('MID04', 'MID05');

-- Set initial reward points based on total earnings
UPDATE affiliates
SET reward_points = FLOOR(total_earnings / 10)::INTEGER
WHERE total_earnings > 0;

-- Insert some test customer relationships
INSERT INTO affiliate_customers (email, referred_by_affiliate_id, first_purchase_date, total_purchases, total_profit_generated)
VALUES 
  ('customer1@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'KING01'), NOW() - INTERVAL '30 days', 5, 500.00),
  ('customer2@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'KING01'), NOW() - INTERVAL '45 days', 3, 300.00),
  ('customer3@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'PRO01'), NOW() - INTERVAL '20 days', 8, 800.00),
  ('customer4@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'PRO01'), NOW() - INTERVAL '10 days', 2, 200.00),
  ('customer5@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'MID01'), NOW() - INTERVAL '15 days', 4, 400.00),
  ('customer6@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'KING02'), NOW() - INTERVAL '60 days', 10, 1000.00),
  ('customer7@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'PRO04'), NOW() - INTERVAL '5 days', 1, 100.00),
  ('customer8@example.com', (SELECT id FROM affiliates WHERE affiliate_code = 'MID04'), NOW() - INTERVAL '25 days', 6, 600.00)
ON CONFLICT (email) DO NOTHING;

-- Set some affiliates to discount mode for testing
UPDATE affiliates
SET 
  commission_mode = 'discount',
  last_mode_change_date = NOW() - INTERVAL '15 days',
  discount_credit_balance = 100.00
WHERE affiliate_code IN ('NEW01', 'NEW02', 'MID05');

-- Generate discount codes for affiliates in discount mode
INSERT INTO affiliate_discount_codes (affiliate_id, code, discount_percent, is_active)
SELECT 
  id,
  affiliate_code || '-EMPLOYEE',
  42.00,
  true
FROM affiliates
WHERE commission_mode = 'discount'
ON CONFLICT (affiliate_id) DO NOTHING;

-- Verify referral chains
SELECT 
  a1.affiliate_code as affiliate,
  a2.affiliate_code as referred_by,
  a3.affiliate_code as referred_by_level_2,
  a1.reward_points,
  a1.commission_mode
FROM affiliates a1
LEFT JOIN affiliates a2 ON a1.referred_by = a2.id
LEFT JOIN affiliates a3 ON a2.referred_by = a3.id
WHERE a1.affiliate_code IN ('KING01', 'KING02', 'PRO01', 'PRO04', 'MID01', 'MID04', 'NEW01')
ORDER BY a1.affiliate_code;



