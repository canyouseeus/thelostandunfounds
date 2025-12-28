-- Admin Setup SQL Script - SIMPLE VERSION
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- DO NOT copy Python files - only SQL files!

-- Step 1: Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_admin ON user_roles(is_admin);

-- Step 3: Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "Allow initial admin setup" ON user_roles;

-- Step 5: Policy - Admins can view all
CREATE POLICY "Admins can view all user roles"
  ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_admin = true
    )
  );

-- Step 6: Policy - Users can view their own role
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 7: Policy - Admins can update
CREATE POLICY "Admins can update user roles"
  ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_admin = true
    )
  );

-- Step 8: Policy - Allow authenticated users to insert (for initial setup)
-- This allows you to create the first admin user
CREATE POLICY "Allow initial admin setup"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 9: Create trigger function
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- Step 11: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_roles TO anon, authenticated;

-- ============================================
-- AFTER RUNNING THE ABOVE SQL:
-- ============================================
-- 
-- 1. Sign up admin@thelostandunfounds.com in your app
-- 2. Get the User ID from Supabase Dashboard → Authentication → Users
-- 3. Run this query (replace USER_ID with the actual ID):
--
-- INSERT INTO user_roles (user_id, email, is_admin)
-- VALUES ('USER_ID_HERE', 'admin@thelostandunfounds.com', true);
--
-- ============================================

