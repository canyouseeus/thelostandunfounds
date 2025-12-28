-- Check User-Subdomain-Email Status
-- Diagnostic query to see why emails aren't being found
-- Run this in Supabase SQL Editor

-- Check if users are linked to subdomains
SELECT 
  'User-Subdomain Links' as check_type,
  us.subdomain,
  us.user_id,
  u.email as user_email_from_auth,
  ur.email as user_email_from_roles,
  (SELECT COUNT(*) FROM blog_submissions WHERE subdomain = us.subdomain) as submissions_count,
  (SELECT COUNT(*) FROM blog_posts WHERE subdomain = us.subdomain) as posts_count
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
LEFT JOIN user_roles ur ON ur.user_id = us.user_id
WHERE us.subdomain IN ('plutonium', 'mrjetstream')
ORDER BY us.subdomain;

-- Check emails in blog_submissions for these subdomains
SELECT 
  'Emails in blog_submissions' as check_type,
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
WHERE bs.subdomain IN ('plutonium', 'mrjetstream')
ORDER BY bs.subdomain, bs.created_at DESC;

-- Check if welcome emails have been sent
SELECT 
  'Welcome Email Status' as check_type,
  us.subdomain,
  us.user_id,
  us.welcome_email_sent_at,
  u.email as user_email
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE us.subdomain IN ('plutonium', 'mrjetstream')
ORDER BY us.subdomain;
