-- Add storage_path column to photos table for direct uploads
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create storage bucket for gallery photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to gallery-photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gallery-photos' );

-- Policy to allow authenticated uploads to gallery-photos
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'gallery-photos' );

-- Policy to allow authenticated deletions
CREATE POLICY "Authenticated Deletes"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'gallery-photos' );
