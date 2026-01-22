-- Fix Admin Policies for Affiliates and Newsletter
-- Ensures admins can access these tables via client-side Supabase client

-- Affiliates Table Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') THEN
    -- Enable RLS
    ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

    -- Drop existing admin policies to ensure clean state
    DROP POLICY IF EXISTS "Admins can view all affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can insert affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can update affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can delete affiliates" ON affiliates;

    -- Create Admin Select Policy
    CREATE POLICY "Admins can view all affiliates"
      ON affiliates FOR SELECT
      USING (is_admin_user());

    -- Create Admin Insert Policy
    CREATE POLICY "Admins can insert affiliates"
      ON affiliates FOR INSERT
      WITH CHECK (is_admin_user());

    -- Create Admin Update Policy
    CREATE POLICY "Admins can update affiliates"
      ON affiliates FOR UPDATE
      USING (is_admin_user());

    -- Create Admin Delete Policy
    CREATE POLICY "Admins can delete affiliates"
      ON affiliates FOR DELETE
      USING (is_admin_user());
      
    RAISE NOTICE 'Added admin policies for affiliates table';
  ELSE
    RAISE WARNING 'Table affiliates does not exist';
  END IF;
END $$;

-- Newsletter Subscribers Table Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    -- Enable RLS
    ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

    -- Drop existing admin policies
    DROP POLICY IF EXISTS "Admins can view all subscribers" ON newsletter_subscribers;
    DROP POLICY IF EXISTS "Admins can insert subscribers" ON newsletter_subscribers;
    DROP POLICY IF EXISTS "Admins can update subscribers" ON newsletter_subscribers;
    DROP POLICY IF EXISTS "Admins can delete subscribers" ON newsletter_subscribers;

    -- Create Admin Select Policy
    CREATE POLICY "Admins can view all subscribers"
      ON newsletter_subscribers FOR SELECT
      USING (is_admin_user());

    -- Create Admin Insert Policy
    CREATE POLICY "Admins can insert subscribers"
      ON newsletter_subscribers FOR INSERT
      WITH CHECK (is_admin_user());

    -- Create Admin Update Policy
    CREATE POLICY "Admins can update subscribers"
      ON newsletter_subscribers FOR UPDATE
      USING (is_admin_user());
      
    -- Create Admin Delete Policy
    CREATE POLICY "Admins can delete subscribers"
      ON newsletter_subscribers FOR DELETE
      USING (is_admin_user());

    RAISE NOTICE 'Added admin policies for newsletter_subscribers table';
  ELSE
    RAISE WARNING 'Table newsletter_subscribers does not exist';
  END IF;
END $$;

-- Tool Limits Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tool_limits') THEN
    ALTER TABLE tool_limits ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all tool limits" ON tool_limits;
    CREATE POLICY "Admins can view all tool limits" ON tool_limits FOR SELECT USING (is_admin_user());
  END IF;
END $$;

-- Tool Usage Policies (Redundant with fix-admin-dashboard-data-access.sql but safe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tool_usage') THEN
    ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all tool usage" ON tool_usage;
    CREATE POLICY "Admins can view all tool usage" ON tool_usage FOR SELECT USING (is_admin_user());
  END IF;
END $$;
