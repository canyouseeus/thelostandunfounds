-- Create brand-assets storage bucket in Supabase Storage
-- This bucket is used for storing brand assets like logos, images, etc.

-- Insert the bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true, -- Public bucket (files are publicly accessible)
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to brand-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets');

-- Create storage policy to allow authenticated users to update files
CREATE POLICY "Authenticated users can update brand-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-assets')
WITH CHECK (bucket_id = 'brand-assets');

-- Create storage policy to allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete from brand-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'brand-assets');

-- Create storage policy to allow public read access
CREATE POLICY "Public can read brand-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'brand-assets');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'brand-assets';
