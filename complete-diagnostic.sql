-- Complete Diagnostic: Check tables, publication, and RLS
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT 
  'Tables Exist' as check_type,
  COUNT(*) as count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
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
AND table_schema = 'public';

-- 2. Check if tables are in publication (REST API access)
SELECT 
  'Tables in Publication' as check_type,
  COUNT(*) as count,
  string_agg(tablename, ', ' ORDER BY tablename) as tables
FROM pg_publication_tables
WHERE pubname = 'supabase'
AND tablename IN (
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
);

-- 3. Check RLS status
SELECT 
  'RLS Enabled' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN (
  'platform_subscriptions',
  'tool_limits',
  'tool_usage',
  'blog_posts',
  'products',
  'user_roles'
)
AND schemaname = 'public'
ORDER BY tablename;

-- 4. Check if publication exists
SELECT 
  'Publication Exists' as check_type,
  pubname,
  COUNT(*) as table_count
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE p.pubname = 'supabase'
GROUP BY p.pubname;




