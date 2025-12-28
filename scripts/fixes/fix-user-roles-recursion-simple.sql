-- Fix 500 Error (Infinite Recursion) in user_roles RLS policies
-- Complete fix: Remove all admin policies that query user_roles to avoid recursion
-- Users can manage their own roles, admins can use service role if needed

-- 1. Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- 2. Create simple, non-recursive policies

-- Policy 1: Users can view their own role
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own role (for auto-promotion)
CREATE POLICY "Users can insert their own role"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own role (for auto-promotion via upsert)
CREATE POLICY "Users can update their own role"
  ON user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Admin policies removed to prevent recursion
-- Admins can still:
-- 1. View/update their own role via user policies above
-- 2. Use service role for admin operations if needed
-- 3. Admin status is checked via email in application code, not RLS

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

