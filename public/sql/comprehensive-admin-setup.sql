-- Comprehensive Admin Setup
-- Ensures both thelostandunfounds@gmail.com and admin@thelostandunfounds.com are recognized as admin
-- Also sets up mrjetstream subdomain and ensures all admin privileges work correctly
-- Run this script to fix all admin recognition issues

-- Create or replace the is_admin_user function (used by RLS policies)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check JWT email claim first (fastest, no database query)
  IF (auth.jwt() ->> 'email')::text IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com') THEN
    RETURN true;
  END IF;

  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN true;
  END IF;

  -- Check user metadata
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() 
    AND (
      (raw_user_meta_data->>'role')::text = 'admin'
      OR (raw_user_meta_data->>'is_admin')::text = 'true'
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated, anon;

-- Create user_roles table if it doesn't exist (DDL must be outside DO block)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes if they don't exist (DDL must be outside DO block)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_admin ON user_roles(is_admin);

-- Enable RLS (DDL must be outside DO block)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (DDL must be outside DO block)
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Public can view roles" ON user_roles;

-- Create RLS policies (DDL must be outside DO block)
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR (auth.jwt() ->> 'email')::text IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

-- Now run the data setup in a DO block (only DML statements here)
DO $$
DECLARE
  admin_user_id_1 UUID;
  admin_user_id_2 UUID;
  admin_email_1 TEXT := 'thelostandunfounds@gmail.com';
  admin_email_2 TEXT := 'admin@thelostandunfounds.com';
BEGIN
  -- Get both admin user IDs
  SELECT id INTO admin_user_id_1
  FROM auth.users
  WHERE email = admin_email_1
  LIMIT 1;

  SELECT id INTO admin_user_id_2
  FROM auth.users
  WHERE email = admin_email_2
  LIMIT 1;

  -- Set up admin for thelostandunfounds@gmail.com
  IF admin_user_id_1 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, email, is_admin, updated_at)
    VALUES (admin_user_id_1, admin_email_1, true, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      is_admin = true,
      email = admin_email_1,
      updated_at = NOW();

    -- Update user metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'role', 'admin',
          'is_admin', true,
          'author_name', COALESCE(raw_user_meta_data->>'author_name', 'THE LOST+UNFOUNDS')
        )
    WHERE id = admin_user_id_1;

    RAISE NOTICE 'Admin role set for % (ID: %)', admin_email_1, admin_user_id_1;
  ELSE
    RAISE WARNING 'User % not found. Please ensure this user has logged in at least once.', admin_email_1;
  END IF;

  -- Set up admin for admin@thelostandunfounds.com
  IF admin_user_id_2 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, email, is_admin, updated_at)
    VALUES (admin_user_id_2, admin_email_2, true, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      is_admin = true,
      email = admin_email_2,
      updated_at = NOW();

    -- Update user metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'role', 'admin',
          'is_admin', true
        )
    WHERE id = admin_user_id_2;

    RAISE NOTICE 'Admin role set for % (ID: %)', admin_email_2, admin_user_id_2;
  ELSE
    RAISE WARNING 'User % not found. Please ensure this user has logged in at least once.', admin_email_2;
  END IF;

  -- Ensure subdomain is set to mrjetstream for thelostandunfounds@gmail.com
  IF admin_user_id_1 IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_subdomains'
  ) THEN
    INSERT INTO user_subdomains (user_id, subdomain)
    VALUES (admin_user_id_1, 'mrjetstream')
    ON CONFLICT (user_id) 
    DO UPDATE SET subdomain = 'mrjetstream';

    RAISE NOTICE 'Subdomain set to mrjetstream for admin user';
  END IF;

END $$;

-- Verify the setup
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as role,
  u.raw_user_meta_data->>'is_admin' as is_admin_metadata,
  u.raw_user_meta_data->>'author_name' as author_name,
  ur.is_admin as is_admin_role,
  us.subdomain
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN user_subdomains us ON us.user_id = u.id
WHERE u.email IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com');

COMMENT ON FUNCTION is_admin_user() IS 'Checks if the current user is an admin by checking JWT email, user_roles table, and user metadata. Used by RLS policies throughout the database.';
