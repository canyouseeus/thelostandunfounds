-- Fix: Remove the problematic "Admins can view all roles" policy that causes recursion
-- This policy likely queries user_roles to check admin status, causing infinite recursion

-- Drop the problematic admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Keep only the essential policies:
-- 1. Users can view their own role ✓
-- 2. Users can insert their own role ✓
-- 3. Users can update their own role ✓
-- 4. Service role can manage roles ✓ (for admin operations via service role)

-- If you need admin viewing capabilities, use the service role or check admin status
-- via email in application code (not via RLS policy querying user_roles)

-- Verify policies after fix
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

