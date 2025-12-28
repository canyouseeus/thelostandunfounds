-- Verification queries for MLM schema
-- Run these after executing all schema files to verify everything is set up correctly

-- 1. Check affiliates table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'affiliates'
  AND column_name IN ('referred_by', 'reward_points', 'total_mlm_earnings', 'commission_mode', 'last_mode_change_date', 'discount_credit_balance')
ORDER BY column_name;

-- 2. Check affiliate_customers table exists
SELECT 
  COUNT(*) as customer_count,
  COUNT(DISTINCT referred_by_affiliate_id) as affiliates_with_customers
FROM affiliate_customers;

-- 3. Check mlm_earnings table exists
SELECT 
  COUNT(*) as mlm_earnings_count,
  COUNT(DISTINCT affiliate_id) as affiliates_with_mlm
FROM mlm_earnings;

-- 4. Check reward_points_history table exists
SELECT 
  COUNT(*) as points_history_count,
  SUM(points) as total_points_awarded
FROM reward_points_history;

-- 5. Check secret_santa_pot table exists
SELECT 
  year,
  total_amount,
  distributed,
  distribution_date
FROM secret_santa_pot
ORDER BY year DESC;

-- 6. Check secret_santa_contributions table exists
SELECT 
  COUNT(*) as contribution_count,
  SUM(amount) as total_contributed
FROM secret_santa_contributions;

-- 7. Check affiliate_discount_codes table exists
SELECT 
  COUNT(*) as discount_code_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_codes
FROM affiliate_discount_codes;

-- 8. Check indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'affiliates',
  'affiliate_customers',
  'mlm_earnings',
  'reward_points_history',
  'secret_santa_pot',
  'secret_santa_contributions',
  'affiliate_discount_codes'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 9. Summary report
SELECT 
  'affiliates' as table_name,
  COUNT(*) as row_count
FROM affiliates
UNION ALL
SELECT 
  'affiliate_customers',
  COUNT(*)
FROM affiliate_customers
UNION ALL
SELECT 
  'mlm_earnings',
  COUNT(*)
FROM mlm_earnings
UNION ALL
SELECT 
  'reward_points_history',
  COUNT(*)
FROM reward_points_history
UNION ALL
SELECT 
  'secret_santa_pot',
  COUNT(*)
FROM secret_santa_pot
UNION ALL
SELECT 
  'secret_santa_contributions',
  COUNT(*)
FROM secret_santa_contributions
UNION ALL
SELECT 
  'affiliate_discount_codes',
  COUNT(*)
FROM affiliate_discount_codes;



