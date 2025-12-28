-- ============================================
-- VERIFY AFFILIATE SETUP
-- ============================================
-- Quick verification script to check if everything is set up correctly
-- Run this after the migration script

-- Check if payout columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'affiliates'
  AND column_name IN ('paypal_email', 'payment_threshold', 'code', 'affiliate_code')
ORDER BY column_name;

-- Check if affiliates table has any data
SELECT COUNT(*) as total_affiliates FROM affiliates;

-- Check if you have users to assign to test affiliates
SELECT COUNT(*) as total_users FROM auth.users;

-- Show first few users (for reference when creating test affiliates)
SELECT id, email FROM auth.users LIMIT 5;

