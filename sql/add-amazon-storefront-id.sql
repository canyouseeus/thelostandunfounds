-- Add Amazon Storefront ID to blog_submissions and blog_posts
-- Run this in Supabase SQL Editor

-- Add amazon_storefront_id to blog_submissions
ALTER TABLE blog_submissions 
ADD COLUMN IF NOT EXISTS amazon_storefront_id TEXT;

-- Add amazon_storefront_id to blog_posts
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS amazon_storefront_id TEXT;

-- Create index for storefront lookups
CREATE INDEX IF NOT EXISTS idx_blog_submissions_storefront ON blog_submissions(amazon_storefront_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_storefront ON blog_posts(amazon_storefront_id);

-- Add comment
COMMENT ON COLUMN blog_submissions.amazon_storefront_id IS 'Amazon Associates Storefront ID or URL. Required for affiliate link tracking.';
COMMENT ON COLUMN blog_posts.amazon_storefront_id IS 'Amazon Associates Storefront ID or URL. Required for affiliate link tracking.';
