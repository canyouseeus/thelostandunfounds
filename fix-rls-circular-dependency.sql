-- Fix RLS Circular Dependency Issue
-- The RLS policies check admin status by querying user_roles,
-- but user_roles itself has RLS, creating a circular dependency.
-- Solution: Create a SECURITY DEFINER function that bypasses RLS

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS is_user_admin(UUID);

-- Create SECURITY DEFINER function to check admin status
-- This bypasses RLS so it can check user_roles without circular dependency
CREATE OR REPLACE FUNCTION is_user_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = user_id_param 
    AND user_roles.is_admin = true
  );
END;
$$;

-- Now update all RLS policies to use this function instead of direct queries

-- Platform Subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON platform_subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
  ON platform_subscriptions FOR ALL
  USING (is_user_admin(auth.uid()));

-- Tool Usage
DROP POLICY IF EXISTS "Admins can manage all usage" ON tool_usage;
CREATE POLICY "Admins can manage all usage"
  ON tool_usage FOR ALL
  USING (is_user_admin(auth.uid()));

-- Blog Posts
DROP POLICY IF EXISTS "Admins can manage blog posts" ON blog_posts;
CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL
  USING (is_user_admin(auth.uid()));

-- Products
DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_user_admin(auth.uid()));

-- Affiliates
DROP POLICY IF EXISTS "Admins can manage affiliates" ON affiliates;
CREATE POLICY "Admins can manage affiliates"
  ON affiliates FOR ALL
  USING (is_user_admin(auth.uid()));

-- Affiliate Commissions
DROP POLICY IF EXISTS "Admins can manage affiliate commissions" ON affiliate_commissions;
CREATE POLICY "Admins can manage affiliate commissions"
  ON affiliate_commissions FOR ALL
  USING (is_user_admin(auth.uid()));

-- User Roles (update the admin check policy)
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
CREATE POLICY "Admins can view all user roles"
  ON user_roles FOR SELECT
  USING (is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
CREATE POLICY "Admins can update user roles"
  ON user_roles FOR UPDATE
  USING (is_user_admin(auth.uid()));

-- Journal Entries
DROP POLICY IF EXISTS "Admins can manage journal entries" ON journal_entries;
CREATE POLICY "Admins can manage journal entries"
  ON journal_entries FOR ALL
  USING (is_user_admin(auth.uid()));

-- Tasks
DROP POLICY IF EXISTS "Admins can manage tasks" ON tasks;
CREATE POLICY "Admins can manage tasks"
  ON tasks FOR ALL
  USING (is_user_admin(auth.uid()));

-- Ideas
DROP POLICY IF EXISTS "Admins can manage ideas" ON ideas;
CREATE POLICY "Admins can manage ideas"
  ON ideas FOR ALL
  USING (is_user_admin(auth.uid()));

-- Help Articles
DROP POLICY IF EXISTS "Admins can manage help articles" ON help_articles;
CREATE POLICY "Admins can manage help articles"
  ON help_articles FOR ALL
  USING (is_user_admin(auth.uid()));

-- Code Snippets
DROP POLICY IF EXISTS "Admins can manage code snippets" ON code_snippets;
CREATE POLICY "Admins can manage code snippets"
  ON code_snippets FOR ALL
  USING (is_user_admin(auth.uid()));

-- Test the function
SELECT 
  'Function Test' as check_type,
  is_user_admin('990e9285-e185-44f8-b8b2-3cbd3bfa4ab5') as is_admin;




