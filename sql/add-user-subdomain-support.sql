-- Add user subdomain support and Amazon affiliate links to blog_posts
-- Run this in Supabase SQL Editor

-- Add subdomain field (for user-specific blogs like username.thelostandunfounds.com)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Add Amazon affiliate links field (stores links from submissions)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS amazon_affiliate_links JSONB DEFAULT '[]';

-- Create index on subdomain for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_subdomain ON blog_posts(subdomain);

-- Create unique constraint on slug per subdomain (allows same slug for different users)
-- Note: This requires dropping the existing unique constraint on slug first
DO $$
BEGIN
  -- Drop existing unique constraint on slug if it exists
  ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
  
  -- Create unique constraint on (subdomain, slug) combination
  -- NULL subdomain means main blog, non-NULL means user subdomain
  CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_subdomain_slug_unique 
  ON blog_posts (COALESCE(subdomain, ''), slug);
END $$;

-- Update RLS policies to allow users to create their own posts
-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert posts" ON blog_posts;

-- New policy: Admins can insert any post, users can insert their own posts
CREATE POLICY "Users and admins can insert posts"
  ON blog_posts
  FOR INSERT
  WITH CHECK (
    -- Admins can insert any post
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
    -- OR users can insert posts where they are the author
    OR auth.uid() = author_id
  );

-- Update policy: Users can update their own posts
DROP POLICY IF EXISTS "Admins can update posts" ON blog_posts;

CREATE POLICY "Users and admins can update posts"
  ON blog_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
    OR auth.uid() = author_id
  );

-- Update policy: Users can delete their own posts
DROP POLICY IF EXISTS "Admins can delete posts" ON blog_posts;

CREATE POLICY "Users and admins can delete posts"
  ON blog_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND email = 'admin@thelostandunfounds.com'
    )
    OR auth.uid() = author_id
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blog_posts TO authenticated;
