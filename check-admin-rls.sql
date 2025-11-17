-- Check if admin user exists and RLS policies are working
-- Run this in Supabase SQL Editor

-- 1. Check if admin user exists in user_roles
SELECT 
  'Admin User Check' as check_type,
  ur.user_id,
  ur.email,
  ur.is_admin,
  u.email as auth_email,
  u.email_confirmed_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.email = 'admin@thelostandunfounds.com' OR u.email = 'admin@thelostandunfounds.com';

-- 2. Test RLS policy evaluation (replace USER_ID with actual user ID from above)
-- This simulates what the RLS policy checks
SELECT 
  'RLS Policy Test' as check_type,
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = '990e9285-e185-44f8-b8b2-3cbd3bfa4ab5' -- Replace with your user_id
    AND ur.is_admin = true
  ) as is_admin_check;

-- 3. Check RLS policies on problematic tables
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as policy_condition
FROM pg_policies 
WHERE tablename IN ('tool_usage', 'products', 'blog_posts', 'tasks', 'ideas', 'affiliates')
ORDER BY tablename, policyname;

-- 4. Check if tables are accessible (test query as service role would see it)
-- This bypasses RLS to see if tables exist
SELECT 
  'Table Access Test' as check_type,
  COUNT(*) as tool_usage_count
FROM tool_usage;

SELECT 
  'Table Access Test' as check_type,
  COUNT(*) as products_count
FROM products;

SELECT 
  'Table Access Test' as check_type,
  COUNT(*) as blog_posts_count
FROM blog_posts;




