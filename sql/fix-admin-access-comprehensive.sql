-- Comprehensive Admin RLS Policy Fixes
-- Enables admins to access all key tables via client-side Supabase client

-- 1. Affiliates Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') THEN
    ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can insert affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can update affiliates" ON affiliates;
    DROP POLICY IF EXISTS "Admins can delete affiliates" ON affiliates;

    CREATE POLICY "Admins can view all affiliates" ON affiliates FOR SELECT USING (is_admin_user());
    CREATE POLICY "Admins can insert affiliates" ON affiliates FOR INSERT WITH CHECK (is_admin_user());
    CREATE POLICY "Admins can update affiliates" ON affiliates FOR UPDATE USING (is_admin_user());
    CREATE POLICY "Admins can delete affiliates" ON affiliates FOR DELETE USING (is_admin_user());
    RAISE NOTICE 'Fixed affiliates policies';
  END IF;
END $$;

-- 2. Newsletter Subscribers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all subscribers" ON newsletter_subscribers;
    CREATE POLICY "Admins can view all subscribers" ON newsletter_subscribers FOR SELECT USING (is_admin_user());
    -- Add write policies if needed, mostly read for analytics
    RAISE NOTICE 'Fixed newsletter_subscribers policies';
  END IF;
END $$;

-- 3. Photo Marketplace Tables (Orders, Libraries, Photos)
DO $$
BEGIN
  -- Photo Orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_orders') THEN
    ALTER TABLE photo_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all orders" ON photo_orders;
    CREATE POLICY "Admins can view all orders" ON photo_orders FOR SELECT USING (is_admin_user());
    RAISE NOTICE 'Fixed photo_orders policies';
  END IF;

  -- Photo Entitlements
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_entitlements') THEN
    ALTER TABLE photo_entitlements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view all entitlements" ON photo_entitlements;
    CREATE POLICY "Admins can view all entitlements" ON photo_entitlements FOR SELECT USING (is_admin_user());
    RAISE NOTICE 'Fixed photo_entitlements policies';
  END IF;

  -- Photo Libraries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_libraries') THEN
     -- Already has "Public can view", but useful for explicit admin management of private ones
    DROP POLICY IF EXISTS "Admins can view all libraries" ON photo_libraries;
    CREATE POLICY "Admins can view all libraries" ON photo_libraries FOR SELECT USING (is_admin_user());
    CREATE POLICY "Admins can insert libraries" ON photo_libraries FOR INSERT WITH CHECK (is_admin_user());
    CREATE POLICY "Admins can update libraries" ON photo_libraries FOR UPDATE USING (is_admin_user());
    CREATE POLICY "Admins can delete libraries" ON photo_libraries FOR DELETE USING (is_admin_user());
    RAISE NOTICE 'Fixed photo_libraries policies';
  END IF;
  
   -- Photos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photos') THEN
    DROP POLICY IF EXISTS "Admins can view all photos" ON photos;
    CREATE POLICY "Admins can view all photos" ON photos FOR SELECT USING (is_admin_user());
    CREATE POLICY "Admins can insert photos" ON photos FOR INSERT WITH CHECK (is_admin_user());
    CREATE POLICY "Admins can update photos" ON photos FOR UPDATE USING (is_admin_user());
    CREATE POLICY "Admins can delete photos" ON photos FOR DELETE USING (is_admin_user());
    RAISE NOTICE 'Fixed photos policies';
  END IF;
END $$;

-- 4. Tool Usage & Subscriptions (Refresher)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tool_usage') THEN
    DROP POLICY IF EXISTS "Admins can view all usage" ON tool_usage;
    CREATE POLICY "Admins can view all usage" ON tool_usage FOR SELECT USING (is_admin_user());
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_subscriptions') THEN
     DROP POLICY IF EXISTS "Admins can view all subscriptions" ON platform_subscriptions;
     CREATE POLICY "Admins can view all subscriptions" ON platform_subscriptions FOR SELECT USING (is_admin_user());
  END IF;
END $$;
