-- Add author_name column to blog_posts table
-- Run this in Supabase SQL Editor

-- Add author_name field (for personalized Amazon Affiliate Disclosure)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Create index for author lookups (optional)
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_name ON blog_posts(author_name);

-- Add comment
COMMENT ON COLUMN blog_posts.author_name IS 'Author name for personalized Amazon Affiliate Disclosure';
