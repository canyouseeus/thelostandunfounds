-- Move "Building a Creative Brand That Rewards People for Life" post to Book Club
-- This adds a subdomain to make it part of the book club collection
-- Run this in Supabase SQL Editor

UPDATE blog_posts
SET subdomain = 'thelostandunfounds'
WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds'
  AND (subdomain IS NULL OR subdomain = '');

-- Verify the update
SELECT 
  id,
  title,
  slug,
  subdomain,
  published,
  published_at
FROM blog_posts
WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds';
