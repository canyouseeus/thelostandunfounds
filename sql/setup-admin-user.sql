-- Setup Admin User
-- Ensures thelostandunfounds@gmail.com is properly recognized as admin
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'thelostandunfounds@gmail.com';
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user % not found in auth.users. Please ensure the user has logged in at least once.', admin_email;
  END IF;

  RAISE NOTICE 'Found admin user: % (ID: %)', admin_email, admin_user_id;

  -- Create user_roles table if it doesn't exist
  CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Create index if it doesn't exist
  CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);

  -- Enable RLS
  ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
  DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
  DROP POLICY IF EXISTS "Service role can manage roles" ON user_roles;

  -- Create RLS policies
  CREATE POLICY "Admins can view all roles"
    ON user_roles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND is_admin = true
      )
      OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid() AND (email = 'admin@thelostandunfounds.com' OR email = 'thelostandunfounds@gmail.com')
      )
    );

  CREATE POLICY "Users can view their own role"
    ON user_roles FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Service role can manage roles"
    ON user_roles FOR ALL
    USING (true)
    WITH CHECK (true);

  -- Grant permissions
  GRANT SELECT ON user_roles TO authenticated;
  GRANT ALL ON user_roles TO service_role;

  -- Insert or update admin role
  INSERT INTO user_roles (user_id, email, is_admin, updated_at)
  VALUES (admin_user_id, admin_email, true, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_admin = true,
    email = admin_email,
    updated_at = NOW();

  RAISE NOTICE 'Admin role set for user %', admin_email;

  -- Update user metadata to ensure admin flags are set
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', 'admin',
        'is_admin', true,
        'author_name', COALESCE(raw_user_meta_data->>'author_name', 'THE LOST+UNFOUNDS')
      )
  WHERE id = admin_user_id;

  RAISE NOTICE 'User metadata updated for admin user';

  -- Ensure subdomain is set to mrjetstream
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_subdomains'
  ) THEN
    INSERT INTO user_subdomains (user_id, subdomain)
    VALUES (admin_user_id, 'mrjetstream')
    ON CONFLICT (user_id) 
    DO UPDATE SET subdomain = 'mrjetstream';

    RAISE NOTICE 'Subdomain set to mrjetstream for admin user';
  ELSE
    RAISE WARNING 'user_subdomains table does not exist. Please run create-user-subdomains-table.sql first.';
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
WHERE u.email = 'thelostandunfounds@gmail.com';
