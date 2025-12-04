-- Fix existing book club posts to have blog_column='bookclub'
-- This ensures all book club posts are visible on the /book-club page
-- Run this in Supabase SQL Editor

DO $$
BEGIN
  -- Check if blog_column field exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'blog_column'
  ) THEN
    -- Update all published posts with subdomain to have blog_column='bookclub'
    -- (Posts with subdomain are book club posts)
    UPDATE blog_posts 
    SET blog_column = 'bookclub'
    WHERE subdomain IS NOT NULL 
      AND (blog_column IS NULL OR blog_column != 'bookclub')
      AND (published = true OR status = 'published');
    
    -- Also update the specific "Join THE LOST ARCHIVES BOOK CLUB" post
    UPDATE blog_posts 
    SET blog_column = 'bookclub'
    WHERE slug = 'join-the-lost-archives-book-club-and-share-your-love-of-books'
      AND (blog_column IS NULL OR blog_column != 'bookclub');
    
    RAISE NOTICE 'Updated book club posts with blog_column=''bookclub''';
  ELSE
    RAISE NOTICE 'blog_column field does not exist. Run add-column-to-blog-posts.sql first.';
  END IF;
END $$;

-- Verify the updates
SELECT 
  id,
  title,
  slug,
  subdomain,
  blog_column,
  published,
  status
FROM blog_posts
WHERE (subdomain IS NOT NULL OR blog_column = 'bookclub')
  AND (published = true OR status = 'published')
ORDER BY published_at DESC NULLS LAST, created_at DESC
LIMIT 20;
