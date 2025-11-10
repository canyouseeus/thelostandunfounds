-- Diagnostic Queries for Supabase Tables
-- Run these in Supabase SQL Editor to check table status

-- 1. Check if tables exist and their schema
SELECT 
  table_name, 
  table_schema,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY table_name;

-- 2. Check permissions on platform_subscriptions
SELECT 
  grantee, 
  privilege_type,
  table_name
FROM information_schema.role_table_grants 
WHERE table_name = 'platform_subscriptions'
ORDER BY grantee, privilege_type;

-- 3. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY tablename;

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY tablename, policyname;

-- 5. Check if tables are in publication (for REST API)
SELECT 
  pubname,
  tablename
FROM pg_publication_tables
WHERE tablename IN ('platform_subscriptions', 'tool_limits', 'tool_usage')
ORDER BY tablename;

-- 6. Test query (should work if everything is set up correctly)
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
SELECT COUNT(*) as subscription_count
FROM platform_subscriptions
WHERE user_id = auth.uid();



