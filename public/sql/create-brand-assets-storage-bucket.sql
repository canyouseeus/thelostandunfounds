-- Create brand-assets storage bucket for brand asset management
-- This bucket stores images (PNG, JPG) and videos (MP4) for use across the site
--
-- IMPORTANT: Storage buckets must be created through the Supabase Dashboard
-- due to permission restrictions. This script only creates the RLS policies.
--
-- To create the bucket:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Set bucket name: "brand-assets"
-- 4. Check "Public bucket" (so files are publicly accessible)
-- 5. Set file size limit: 50MB
-- 6. Click "Create bucket"
-- 7. Then run this script to set up the RLS policies

-- Try to create the bucket (may fail if you don't have owner permissions)
-- If this fails, create the bucket through the Supabase Dashboard first
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'brand-assets',
    'brand-assets',
    true, -- Public bucket so assets can be accessed via public URLs
    52428800, -- 50MB file size limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'video/mp4']
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'video/mp4'];
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create bucket - insufficient privileges. Please create the "brand-assets" bucket through the Supabase Dashboard first, then run this script to set up policies.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating bucket: %. Please create the "brand-assets" bucket through the Supabase Dashboard first, then run this script to set up policies.', SQLERRM;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to list brand assets" ON storage.objects;

-- Ensure is_admin_user function exists (from comprehensive-admin-setup.sql)
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

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated, anon;

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files (any authenticated user can upload)
-- Admins have full access, regular users can upload
CREATE POLICY "Allow authenticated users to upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
);

-- Allow authenticated users to update files (any authenticated user can update)
CREATE POLICY "Allow authenticated users to update brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
)
WITH CHECK (
  bucket_id = 'brand-assets'
);

-- Allow authenticated users to delete files (any authenticated user can delete)
CREATE POLICY "Allow authenticated users to delete brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Allow public read access to brand assets"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'brand-assets'
);

-- Allow authenticated users to list files
CREATE POLICY "Allow authenticated users to list brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets'
);

-- Verify the bucket exists and policies were created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'brand-assets') THEN
    RAISE NOTICE 'Bucket "brand-assets" exists. RLS policies have been created.';
  ELSE
    RAISE WARNING 'Bucket "brand-assets" does not exist. Please create it through the Supabase Dashboard first.';
  END IF;
END $$;

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads. The brand-assets bucket stores brand images and videos.';
COMMENT ON POLICY "Allow authenticated users to upload brand assets" ON storage.objects IS 'Allows authenticated users to upload brand assets (PNG, JPG, MP4)';
COMMENT ON POLICY "Allow public read access to brand assets" ON storage.objects IS 'Allows public read access to brand assets for use in the site';
