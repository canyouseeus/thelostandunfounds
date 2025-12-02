-- Create brand-assets storage bucket for brand asset management
-- This bucket stores images (PNG, JPG) and videos (MP4) for use across the site

-- Create the storage bucket
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

-- Create RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload brand assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  (storage.foldername(name))[1] = '' -- Allow uploads to root or any folder
);

-- Allow authenticated users to update their own files
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

-- Allow authenticated users to delete files
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

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads. The brand-assets bucket stores brand images and videos.';
COMMENT ON POLICY "Allow authenticated users to upload brand assets" ON storage.objects IS 'Allows authenticated users to upload brand assets (PNG, JPG, MP4)';
COMMENT ON POLICY "Allow public read access to brand assets" ON storage.objects IS 'Allows public read access to brand assets for use in the site';
