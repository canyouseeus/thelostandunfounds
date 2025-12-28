-- Fix: Expose Tables via Supabase REST API
-- Run this if you're getting 406 errors

-- Method 1: Add to supabase_realtime publication (for REST API access)
-- Check if tables are already in publication first, then add if not
DO $$
DECLARE
  table_in_pub BOOLEAN;
BEGIN
  -- Check and add platform_subscriptions
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'platform_subscriptions'
  ) INTO table_in_pub;
  
  IF NOT table_in_pub THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE platform_subscriptions;
    RAISE NOTICE 'Added platform_subscriptions to publication';
  ELSE
    RAISE NOTICE 'platform_subscriptions already in publication';
  END IF;

  -- Check and add tool_limits
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'tool_limits'
  ) INTO table_in_pub;
  
  IF NOT table_in_pub THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tool_limits;
    RAISE NOTICE 'Added tool_limits to publication';
  ELSE
    RAISE NOTICE 'tool_limits already in publication';
  END IF;

  -- Check and add tool_usage
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'tool_usage'
  ) INTO table_in_pub;
  
  IF NOT table_in_pub THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tool_usage;
    RAISE NOTICE 'Added tool_usage to publication';
  ELSE
    RAISE NOTICE 'tool_usage already in publication';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Method 2: Ensure permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_subscriptions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tool_limits TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tool_usage TO anon, authenticated;

-- Verify tables are in publication
SELECT 
  pubname,
  tablename,
  schemaname
FROM pg_publication_tables
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY tablename;

