-- Fix RLS policies for blog_submissions table
-- This fixes the "permission denied for table users" error
-- Run this in Supabase SQL Editor

-- Create or replace SECURITY DEFINER function to check if user is admin
-- This function checks multiple sources: JWT claims (fastest), user_roles table, and auth.users
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- First check JWT claims (fastest, no database query)
  user_email := (auth.jwt() ->> 'email')::text;
  IF user_email IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com') THEN
    RETURN true;
  END IF;

  -- Then check user_roles table
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN true;
  END IF;

  -- Last resort: check email in auth.users (requires SECURITY DEFINER)
  -- This is only needed if JWT doesn't have email or user_roles check fails
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF user_email IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated, anon;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can update submissions" ON blog_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON blog_submissions;

-- Recreate policies using the function instead of direct auth.users query
CREATE POLICY "Admins can update submissions"
  ON blog_submissions
  FOR UPDATE
  USING (is_admin_user());

CREATE POLICY "Admins can delete submissions"
  ON blog_submissions
  FOR DELETE
  USING (is_admin_user());
