-- Test RLS Policy - Check if auth.uid() works correctly
-- Run this to verify RLS is working as expected

-- First, check what auth.uid() returns for the current user
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Test query that should work if RLS is correct
-- This should return rows if you have a subscription, or empty if you don't
SELECT 
  id,
  user_id,
  tier,
  status,
  auth.uid() as auth_user_id,
  (auth.uid() = user_id) as rls_check_passes
FROM platform_subscriptions
WHERE status = 'active'
ORDER BY started_at DESC
LIMIT 1;

-- If the above returns a row but rls_check_passes is false,
-- then there's a mismatch between auth.uid() and user_id

-- Alternative: Check if we can query without RLS (temporarily disable to test)
-- NOTE: Only run this for testing, then re-enable RLS!
-- ALTER TABLE platform_subscriptions DISABLE ROW LEVEL SECURITY;
-- SELECT * FROM platform_subscriptions LIMIT 1;
-- ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;



