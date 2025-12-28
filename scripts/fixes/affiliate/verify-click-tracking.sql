-- ============================================
-- VERIFY CLICK TRACKING SETUP
-- ============================================
-- Run this to check if everything is set up correctly for click tracking

-- 1. Check if SQL function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'increment_affiliate_clicks';

-- 2. Check column names in affiliates table
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'affiliates'
  AND column_name IN ('code', 'affiliate_code')
ORDER BY column_name;

-- 3. Check if test affiliate exists and what column it uses
SELECT 
  id,
  code,
  affiliate_code,
  status,
  total_clicks
FROM affiliates
WHERE code = 'TEST-AFFILIATE-1' OR affiliate_code = 'TEST-AFFILIATE-1';

-- 4. Test the function manually (if affiliate exists)
-- Uncomment and run if you want to test:
-- SELECT increment_affiliate_clicks((SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-1' OR affiliate_code = 'TEST-AFFILIATE-1' LIMIT 1));

