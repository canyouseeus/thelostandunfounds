-- Ensure author_name column exists in blog_posts table
-- This script is safe to run multiple times
-- Run this in Supabase SQL Editor

-- Add author_name column if it doesn't exist
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Create index for author lookups (optional, safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_name ON blog_posts(author_name);

-- Add comment
COMMENT ON COLUMN blog_posts.author_name IS 'Author name for personalized Amazon Affiliate Disclosure. Stores the author name from blog_submissions when a post is published.';
