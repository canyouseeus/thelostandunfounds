-- ============================================
-- AFFILIATE PROGRAM TEST SCRIPT
-- ============================================
-- This script creates test data for testing the affiliate program
-- Run this in Supabase SQL Editor BEFORE testing

-- ============================================
-- STEP 1: Create Test Affiliates
-- ============================================
-- NOTE: Run scripts/schema/affiliate/add-payout-columns.sql FIRST
-- to add paypal_email and payment_threshold columns

-- Test Affiliate 1 (Main affiliate)
-- Use 'code' if it exists, otherwise use 'affiliate_code'
INSERT INTO affiliates (user_id, code, status, commission_rate, paypal_email, payment_threshold)
VALUES 
  (
    (SELECT id FROM auth.users LIMIT 1), -- Use first user, or set specific UUID
    'TEST-AFFILIATE-1',
    'active',
    42.00,
    'test-affiliate-1@example.com',
    50.00
  )
ON CONFLICT (code) DO UPDATE SET
  status = 'active',
  commission_rate = 42.00,
  paypal_email = 'test-affiliate-1@example.com',
  payment_threshold = 50.00;

-- Test Affiliate 2 (Level 1 referral)
INSERT INTO affiliates (user_id, code, status, commission_rate, referred_by, paypal_email)
VALUES 
  (
    (SELECT id FROM auth.users LIMIT 1 OFFSET 1), -- Use second user, or set specific UUID
    'TEST-AFFILIATE-2',
    'active',
    42.00,
    (SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-1'),
    'test-affiliate-2@example.com'
  )
ON CONFLICT (code) DO UPDATE SET
  status = 'active',
  commission_rate = 42.00,
  referred_by = (SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-1'),
  paypal_email = 'test-affiliate-2@example.com';

-- Test Affiliate 3 (Level 2 referral)
INSERT INTO affiliates (user_id, code, status, commission_rate, referred_by, paypal_email)
VALUES 
  (
    (SELECT id FROM auth.users LIMIT 1 OFFSET 2), -- Use third user, or set specific UUID
    'TEST-AFFILIATE-3',
    'active',
    42.00,
    (SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-2'),
    'test-affiliate-3@example.com'
  )
ON CONFLICT (code) DO UPDATE SET
  status = 'active',
  commission_rate = 42.00,
  referred_by = (SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-2'),
  paypal_email = 'test-affiliate-3@example.com';

-- ============================================
-- STEP 2: Create Test Product Cost
-- ============================================

-- Set cost for a test product (assuming you have products)
INSERT INTO product_costs (product_id, source, cost)
VALUES 
  (
    (SELECT handle FROM products WHERE status = 'active' LIMIT 1),
    'local',
    5.00
  )
ON CONFLICT (product_id, variant_id, source) DO UPDATE SET
  cost = 5.00;

-- ============================================
-- STEP 3: Verify Test Data
-- ============================================

-- Check affiliates
SELECT 
  code,
  status,
  commission_rate,
  total_earnings,
  total_clicks,
  total_conversions,
  paypal_email,
  payment_threshold,
  referred_by
FROM affiliates
WHERE code LIKE 'TEST-%'
ORDER BY code;

-- Check product costs
SELECT 
  product_id,
  source,
  cost
FROM product_costs
WHERE product_id IN (SELECT handle FROM products WHERE status = 'active' LIMIT 1);

-- ============================================
-- STEP 4: Clean Up (Optional - Run after testing)
-- ============================================

-- Uncomment to clean up test data:
-- DELETE FROM affiliate_commissions WHERE affiliate_id IN (SELECT id FROM affiliates WHERE code LIKE 'TEST-%');
-- DELETE FROM affiliate_customers WHERE referred_by_affiliate_id IN (SELECT id FROM affiliates WHERE code LIKE 'TEST-%');
-- DELETE FROM affiliates WHERE code LIKE 'TEST-%';

