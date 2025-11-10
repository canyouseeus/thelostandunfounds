-- Check REST API Access for Tables
-- Run this in Supabase SQL Editor to diagnose 403 errors

-- 1. Check if tables are in the correct publication for REST API
-- Note: Supabase REST API uses the 'supabase' publication, not just 'supabase_realtime'
SELECT 
  pubname,
  tablename,
  schemaname
FROM pg_publication_tables
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY pubname, tablename;

-- 2. Check all available publications
SELECT pubname FROM pg_publication;

-- 3. If 'supabase' publication exists, add tables to it
-- (This is what enables REST API access)
DO $$
BEGIN
  -- Check if 'supabase' publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase') THEN
    -- Add tables to supabase publication (for REST API)
    ALTER PUBLICATION supabase ADD TABLE IF NOT EXISTS platform_subscriptions;
    ALTER PUBLICATION supabase ADD TABLE IF NOT EXISTS tool_limits;
    ALTER PUBLICATION supabase ADD TABLE IF NOT EXISTS tool_usage;
    RAISE NOTICE 'Added tables to supabase publication';
  ELSE
    RAISE NOTICE 'supabase publication does not exist - this is normal for some Supabase setups';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Note: %', SQLERRM;
END $$;

-- 4. Verify RLS policies are correct
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as policy_condition
FROM pg_policies 
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY tablename, policyname;

-- 5. Test query as authenticated user (should work)
-- This will only work if you're logged in
SELECT COUNT(*) as subscription_count
FROM platform_subscriptions
WHERE user_id = auth.uid();

-- 6. Test query as anonymous user (should return empty, not 403)
-- tool_limits should be readable by anyone
SELECT COUNT(*) as tool_limits_count
FROM tool_limits;



