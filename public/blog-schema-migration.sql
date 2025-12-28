-- Migration: Add missing fields to blog_posts table
-- Run this in Supabase SQL Editor to add SEO fields and published boolean
-- This migrates the existing blog_posts table to support the new blog functionality

-- First, ensure author_id column exists (it might not if table was created differently)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE blog_posts 
    ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Set author_id to NULL for existing posts (can be updated later)
    UPDATE blog_posts SET author_id = NULL WHERE author_id IS NULL;
  END IF;
END $$;

-- Add published boolean field (derived from status)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- Update published field based on existing status
UPDATE blog_posts 
SET published = (status = 'published')
WHERE published IS NULL OR published = false;

-- Make published field NOT NULL after setting values
ALTER TABLE blog_posts 
ALTER COLUMN published SET NOT NULL,
ALTER COLUMN published SET DEFAULT false;

-- Add SEO fields
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

-- Add og_image_url field (alternative to featured_image)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Create index on published field for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_boolean ON blog_posts(published);

-- Create a trigger to keep status and published in sync
CREATE OR REPLACE FUNCTION sync_blog_post_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes, update published
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      NEW.published = (NEW.status = 'published');
    END IF;
  END IF;
  
  -- If published changes, update status
  IF NEW.published != OLD.published THEN
    IF NEW.published = true THEN
      NEW.status = 'published';
      -- Set published_at if not already set
      IF NEW.published_at IS NULL THEN
        NEW.published_at = NOW();
      END IF;
    ELSE
      NEW.status = 'draft';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_blog_post_status_trigger ON blog_posts;
CREATE TRIGGER sync_blog_post_status_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_blog_post_status();

-- Ensure RLS is enabled
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh and avoid conflicts
-- Drop all possible policy names that might exist
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on blog_posts table
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'blog_posts' AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON blog_posts', r.policyname);
  END LOOP;
END $$;

-- Policy: Anyone can view published posts (using published field)
-- NO user_roles check - completely avoids recursion
CREATE POLICY "Anyone can view published posts"
  ON blog_posts
  FOR SELECT
  USING (
    -- Anonymous users can read published posts
    published = true
    -- OR authenticated users who are the author can read their own posts (even if not published)
    OR (auth.uid() IS NOT NULL AND author_id IS NOT NULL AND auth.uid() = author_id)
  );

-- Policy: Only admins can insert posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can insert posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can update posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can update posts"
  ON blog_posts
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can delete posts
-- Check email directly - NO user_roles table access
CREATE POLICY "Admins can delete posts"
  ON blog_posts
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
  );

-- Grant permissions
GRANT SELECT ON blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON blog_posts TO authenticated;

-- Ensure table is in publication for realtime (if needed)
DO $$
BEGIN
  -- Check if table is already in publication before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'blog_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blog_posts;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Added fields: published, seo_title, seo_description, seo_keywords, og_image_url';
  RAISE NOTICE 'Created sync trigger to keep status and published fields in sync';
END $$;
