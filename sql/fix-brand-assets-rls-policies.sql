-- Fix Brand Assets Storage RLS Policies
-- This script fixes the RLS policy violation when uploading brand assets
-- Run this script if you're getting "new row violates row-level security policy" errors

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Allow authenticated users to upload brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to list brand assets" ON storage.objects;

-- Ensure is_admin_user function exists
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

-- INSERT Policy: Allow authenticated users to upload files
-- The owner field is automatically set by Supabase to auth.uid() during upload
-- We only check bucket_id to allow the upload
CREATE POLICY "Allow authenticated users to upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
);

-- UPDATE Policy: Users can update their own files, admins can update any file
CREATE POLICY "Allow authenticated users to update brand assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (owner = auth.uid() OR is_admin_user())
)
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (owner = auth.uid() OR is_admin_user())
);

-- DELETE Policy: Users can delete their own files, admins can delete any file
CREATE POLICY "Allow authenticated users to delete brand assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  (owner = auth.uid() OR is_admin_user())
);

-- SELECT Policy: Public read access (since bucket is public)
CREATE POLICY "Allow public read access to brand assets"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'brand-assets'
);

-- SELECT Policy: Authenticated users can list files
CREATE POLICY "Allow authenticated users to list brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets'
);

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload brand assets'
  ) THEN
    RAISE NOTICE 'Brand assets RLS policies have been created successfully.';
  ELSE
    RAISE WARNING 'Failed to create brand assets RLS policies.';
  END IF;
END $$;
