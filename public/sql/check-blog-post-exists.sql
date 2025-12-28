-- Check if the blog post exists and its status
-- Run this in Supabase SQL Editor to diagnose why posts aren't showing

SELECT 
  id,
  title,
  slug,
  published,
  status,
  published_at,
  created_at,
  CASE 
    WHEN published = true THEN '✅ Published'
    WHEN published = false THEN '❌ Not Published'
    ELSE '⚠️ Published field is NULL'
  END as publish_status,
  CASE
    WHEN status = 'published' THEN '✅ Status Published'
    ELSE '❌ Status: ' || COALESCE(status, 'NULL')
  END as status_check
FROM blog_posts
WHERE slug = 'artificial-intelligence-the-job-killer'
ORDER BY created_at DESC;

-- Also check all posts
SELECT 
  COUNT(*) as total_posts,
  COUNT(*) FILTER (WHERE published = true) as published_count,
  COUNT(*) FILTER (WHERE status = 'published') as status_published_count,
  COUNT(*) FILTER (WHERE published = true AND status = 'published') as both_published_count
FROM blog_posts;
