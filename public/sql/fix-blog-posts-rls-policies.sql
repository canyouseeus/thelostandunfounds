-- Fix RLS policies for blog_posts table
-- This fixes the "permission denied for table users" error when publishing
-- Run this in Supabase SQL Editor

-- Ensure is_admin_user() function exists (reuse from blog_submissions fix)
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

-- Drop existing policies that query auth.users directly
DROP POLICY IF EXISTS "Users and admins can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Users and admins can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Users and admins can delete posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON blog_posts;

-- Recreate INSERT policy using is_admin_user() function
CREATE POLICY "Users and admins can insert posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (
    -- Admins can insert any post
    is_admin_user()
    -- OR users can insert posts where they are the author
    OR auth.uid() = author_id
  );

-- Recreate UPDATE policy using is_admin_user() function
CREATE POLICY "Users and admins can update posts"
  ON blog_posts
  FOR UPDATE
  USING (
    -- Admins can update any post
    is_admin_user()
    -- OR users can update their own posts
    OR auth.uid() = author_id
  );

-- Recreate DELETE policy using is_admin_user() function
CREATE POLICY "Users and admins can delete posts"
  ON blog_posts
  FOR DELETE
  USING (
    -- Admins can delete any post
    is_admin_user()
    -- OR users can delete their own posts
    OR auth.uid() = author_id
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blog_posts TO authenticated;
