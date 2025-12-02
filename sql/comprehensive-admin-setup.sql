-- Comprehensive Admin Setup
-- Ensures both thelostandunfounds@gmail.com and admin@thelostandunfounds.com are recognized as admin
-- Also sets up mrjetstream subdomain and ensures all admin privileges work correctly
-- Run this script to fix all admin recognition issues

-- Step 1: Create the is_admin_user function
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() ->> 'email')::text IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com') THEN
    RETURN true;
  END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND is_admin = true) THEN
    RETURN true;
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() 
    AND ((raw_user_meta_data->>'role')::text = 'admin' OR (raw_user_meta_data->>'is_admin')::text = 'true')
  ) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated, anon;

-- Step 2: Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_admin ON user_roles(is_admin);

-- Step 4: Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Public can view roles" ON user_roles;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND is_admin = true)
    OR (auth.jwt() ->> 'email')::text IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

-- Step 7: Set up admin users (data operations in DO block)
DO $$
DECLARE
  admin_user_id_1 UUID;
  admin_user_id_2 UUID;
BEGIN
  SELECT id INTO admin_user_id_1 FROM auth.users WHERE email = 'thelostandunfounds@gmail.com' LIMIT 1;
  SELECT id INTO admin_user_id_2 FROM auth.users WHERE email = 'admin@thelostandunfounds.com' LIMIT 1;

  IF admin_user_id_1 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, email, is_admin, updated_at)
    VALUES (admin_user_id_1, 'thelostandunfounds@gmail.com', true, NOW())
    ON CONFLICT (user_id) DO UPDATE SET is_admin = true, email = 'thelostandunfounds@gmail.com', updated_at = NOW();
    
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'admin', 'is_admin', true, 'author_name', COALESCE(raw_user_meta_data->>'author_name', 'THE LOST+UNFOUNDS'))
    WHERE id = admin_user_id_1;
    
    RAISE NOTICE 'Admin role set for thelostandunfounds@gmail.com (ID: %)', admin_user_id_1;
  ELSE
    RAISE WARNING 'User thelostandunfounds@gmail.com not found. Please ensure this user has logged in at least once.';
  END IF;

  IF admin_user_id_2 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, email, is_admin, updated_at)
    VALUES (admin_user_id_2, 'admin@thelostandunfounds.com', true, NOW())
    ON CONFLICT (user_id) DO UPDATE SET is_admin = true, email = 'admin@thelostandunfounds.com', updated_at = NOW();
    
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'admin', 'is_admin', true)
    WHERE id = admin_user_id_2;
    
    RAISE NOTICE 'Admin role set for admin@thelostandunfounds.com (ID: %)', admin_user_id_2;
  ELSE
    RAISE WARNING 'User admin@thelostandunfounds.com not found. Please ensure this user has logged in at least once.';
  END IF;

  IF admin_user_id_1 IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subdomains') THEN
    INSERT INTO user_subdomains (user_id, subdomain)
    VALUES (admin_user_id_1, 'mrjetstream')
    ON CONFLICT (user_id) DO UPDATE SET subdomain = 'mrjetstream';
    RAISE NOTICE 'Subdomain set to mrjetstream for admin user';
  END IF;
END $$;

-- Step 8: Verify the setup
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
