-- Fix Admin Dashboard Data Access
-- Adds admin policies to platform_subscriptions and tool_usage tables
-- Allows admins to view all subscriptions and usage data for the dashboard

-- Ensure is_admin_user function exists
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

-- Add admin policy to platform_subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON platform_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON platform_subscriptions
  FOR SELECT
  USING (is_admin_user());

-- Add admin policy to tool_usage
DROP POLICY IF EXISTS "Admins can view all usage" ON tool_usage;
CREATE POLICY "Admins can view all usage"
  ON tool_usage
  FOR SELECT
  USING (is_admin_user());

-- Add admin policy to user_subdomains (if it doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subdomains') THEN
    DROP POLICY IF EXISTS "Admins can view all subdomains" ON user_subdomains;
    EXECUTE 'CREATE POLICY "Admins can view all subdomains"
      ON user_subdomains
      FOR SELECT
      USING (is_admin_user())';
  END IF;
END $$;

-- Add admin policy to user_roles (if it doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
    EXECUTE 'CREATE POLICY "Admins can view all roles"
      ON user_roles
      FOR SELECT
      USING (is_admin_user())';
  END IF;
END $$;

COMMENT ON POLICY "Admins can view all subscriptions" ON platform_subscriptions IS 'Allows admins to view all platform subscriptions for dashboard analytics';
COMMENT ON POLICY "Admins can view all usage" ON tool_usage IS 'Allows admins to view all tool usage data for dashboard analytics';
