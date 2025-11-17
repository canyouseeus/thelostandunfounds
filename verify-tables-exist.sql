-- Simple check: Do ANY of our tables exist?
-- This will show you exactly what's in your database

-- Check for our tables
SELECT 
  'Our Tables' as check_type,
  table_name,
  'EXISTS' as status
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

-- If no rows above, show ALL tables in public schema
SELECT 
  'All Tables in Public Schema' as check_type,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;




