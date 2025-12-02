-- Fix 500 Error (Infinite Recursion) in user_roles RLS policies
-- The previous policy "Admins can view all user roles" caused infinite recursion
-- because it selected from user_roles to check if the user can select from user_roles.

-- 1. Create a secure function to check admin status WITHOUT querying user_roles
-- This function checks user metadata instead to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
SET search_path = public -- Security best practice
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user email from auth.users (no RLS on auth schema)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if email matches admin emails (no table query needed)
  RETURN user_email IN (
    'admin@thelostandunfounds.com',
    'thelostandunfounds@gmail.com'
  ) OR EXISTS (
    -- Also check user_metadata for admin role (bypasses RLS via SECURITY DEFINER)
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (
      (raw_user_meta_data->>'role') = 'admin'
      OR (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

-- 2. Update RLS policies to use the function

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_roles;

-- Re-create policies in correct order (user policies first, then admin policies)

-- Policy 1: Users can view their own role (NO circular dependency - must work first)
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own role (for auto-promotion)
CREATE POLICY "Users can insert their own role"
  ON user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own role (for auto-promotion)
CREATE POLICY "Users can update their own role"
  ON user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admins can view all user roles
-- Uses email check directly (no function call) to avoid any potential recursion
CREATE POLICY "Admins can view all user roles"
  ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
    )
  );

-- Policy 5: Admins can update any role
-- Uses email check directly (no function call) to avoid any potential recursion
CREATE POLICY "Admins can update user roles"
  ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
    )
  );

-- Note: We DON'T create an admin INSERT policy because:
-- 1. Regular users need to insert their own role (Policy 2 handles this)
-- 2. Admins can insert via the user self-insert policy if they're inserting their own role
-- 3. If admins need to insert OTHER users' roles, they can do so via service role or by updating existing rows

-- Verify the function works
-- SELECT check_is_admin();

