-- Quick check: Do the tables exist?
-- Run this in Supabase SQL Editor to verify

SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name IN (
  'platform_subscriptions',
  'tool_limits',
  'tool_usage',
  'blog_posts',
  'products',
  'user_roles',
  'journal_entries',
  'tasks',
  'ideas',
  'help_articles',
  'code_snippets'
)
AND table_schema = 'public'
ORDER BY table_name;

