-- Diagnose User-Subdomain Connections
-- This script helps identify why users aren't connected to their subdomains
-- Run this in Supabase SQL Editor

-- 1. Check all users with subdomains
SELECT 
  'Users with subdomains' as check_type,
  us.user_id,
  us.subdomain,
  u.email as user_email,
  u.created_at as user_created_at,
  us.created_at as subdomain_created_at
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
ORDER BY us.subdomain;

-- 2. Check subdomains mentioned in blog_submissions
SELECT 
  'Subdomains in blog_submissions' as check_type,
  bs.subdomain,
  bs.author_email,
  bs.author_name,
  bs.status,
  bs.created_at,
  us.user_id as linked_user_id,
  u.email as linked_user_email
FROM blog_submissions bs
LEFT JOIN user_subdomains us ON us.subdomain = bs.subdomain
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE bs.subdomain IS NOT NULL
ORDER BY bs.subdomain, bs.created_at DESC;

-- 3. Check subdomains mentioned in blog_posts
SELECT 
  'Subdomains in blog_posts' as check_type,
  bp.subdomain,
  bp.author_id,
  bp.user_id,
  bp.created_at,
  us.user_id as linked_user_id,
  u.email as linked_user_email
FROM blog_posts bp
LEFT JOIN user_subdomains us ON us.subdomain = bp.subdomain
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE bp.subdomain IS NOT NULL
ORDER BY bp.subdomain, bp.created_at DESC;

-- 4. Find orphaned subdomains (subdomains in blog_submissions/blog_posts but not in user_subdomains)
SELECT 
  'Orphaned subdomains' as check_type,
  COALESCE(bs.subdomain, bp.subdomain) as subdomain,
  bs.author_email,
  bs.author_name,
  bp.author_id as post_author_id,
  bp.user_id as post_user_id,
  'Missing from user_subdomains' as issue
FROM (
  SELECT DISTINCT subdomain, author_email, author_name
  FROM blog_submissions
  WHERE subdomain IS NOT NULL
) bs
FULL OUTER JOIN (
  SELECT DISTINCT subdomain, author_id, user_id
  FROM blog_posts
  WHERE subdomain IS NOT NULL
) bp ON bs.subdomain = bp.subdomain
WHERE NOT EXISTS (
  SELECT 1 FROM user_subdomains us 
  WHERE us.subdomain = COALESCE(bs.subdomain, bp.subdomain)
)
ORDER BY COALESCE(bs.subdomain, bp.subdomain);

-- 5. Find users who might own subdomains based on email matching
SELECT 
  'Potential user-subdomain matches' as check_type,
  u.id as user_id,
  u.email as user_email,
  bs.subdomain,
  bs.author_email,
  bs.author_name,
  CASE 
    WHEN us.user_id IS NOT NULL THEN 'Already linked'
    WHEN u.email = bs.author_email THEN 'Email matches - can link'
    ELSE 'Email mismatch'
  END as match_status
FROM auth.users u
INNER JOIN blog_submissions bs ON LOWER(TRIM(u.email)) = LOWER(TRIM(bs.author_email))
LEFT JOIN user_subdomains us ON us.subdomain = bs.subdomain AND us.user_id = u.id
WHERE bs.subdomain IS NOT NULL
ORDER BY bs.subdomain, u.email;

-- 6. Specific check for plutonium and mrjetstream
SELECT 
  'Specific subdomain check' as check_type,
  'plutonium' as subdomain,
  us.user_id,
  u.email as user_email,
  u.id as auth_user_id,
  (SELECT COUNT(*) FROM blog_submissions WHERE subdomain = 'plutonium') as submissions_count,
  (SELECT COUNT(*) FROM blog_posts WHERE subdomain = 'plutonium') as posts_count
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE us.subdomain = 'plutonium'
UNION ALL
SELECT 
  'Specific subdomain check' as check_type,
  'mrjetstream' as subdomain,
  us.user_id,
  u.email as user_email,
  u.id as auth_user_id,
  (SELECT COUNT(*) FROM blog_submissions WHERE subdomain = 'mrjetstream') as submissions_count,
  (SELECT COUNT(*) FROM blog_posts WHERE subdomain = 'mrjetstream') as posts_count
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE us.subdomain = 'mrjetstream';
