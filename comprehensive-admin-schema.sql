-- Comprehensive Admin Dashboard Database Schema

-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- This schema includes ALL tables needed for the admin dashboard

-- ============================================

-- PLATFORM SUBSCRIPTION TABLES

-- ============================================

-- Platform subscriptions table (shared across all tools)

CREATE TABLE IF NOT EXISTS platform_subscriptions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),

  paypal_subscription_id TEXT UNIQUE,

  started_at TIMESTAMPTZ DEFAULT NOW(),

  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Tool limits configuration (defines limits per tool per tier)

CREATE TABLE IF NOT EXISTS tool_limits (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tool_id TEXT NOT NULL,

  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),

  limit_type TEXT NOT NULL, -- 'daily_downloads', 'monthly_api_calls', etc.

  limit_value INTEGER, -- NULL = unlimited

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tool_id, tier, limit_type)

);

-- Tool usage tracking (tracks user actions across all tools)

CREATE TABLE IF NOT EXISTS tool_usage (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  tool_id TEXT NOT NULL, -- 'tiktok', etc.

  action TEXT NOT NULL, -- 'download', 'convert', 'api_call', etc.

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- ============================================

-- BLOG & PRODUCT TABLES

-- ============================================

-- Blog Posts Table

CREATE TABLE IF NOT EXISTS blog_posts (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  slug TEXT UNIQUE NOT NULL,

  content TEXT NOT NULL,

  excerpt TEXT,

  featured_image TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Products Table

CREATE TABLE IF NOT EXISTS products (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,

  slug TEXT UNIQUE NOT NULL,

  description TEXT,

  price DECIMAL(10, 2) NOT NULL DEFAULT 0,

  compare_at_price DECIMAL(10, 2),

  sku TEXT,

  inventory_quantity INTEGER,

  images TEXT[] DEFAULT '{}',

  category TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Affiliates Table

CREATE TABLE IF NOT EXISTS affiliates (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  code TEXT UNIQUE NOT NULL,

  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,

  total_clicks INTEGER NOT NULL DEFAULT 0,

  total_conversions INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Affiliate Commissions Table

CREATE TABLE IF NOT EXISTS affiliate_commissions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  order_id UUID,

  amount DECIMAL(10, 2) NOT NULL,

  profit_generated DECIMAL(10, 2), -- Profit from this sale (retail_price - product_cost)

  source TEXT CHECK (source IN ('fourthwall', 'paypal')), -- 'fourthwall' or 'paypal'

  product_cost DECIMAL(10, 2), -- Cost of product for profit calculation

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- ============================================

-- ADMIN DASHBOARD TABLES

-- ============================================

-- User Roles Table (Required for RLS policies)

CREATE TABLE IF NOT EXISTS user_roles (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  email TEXT NOT NULL,

  is_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- User Roles Indexes

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);

CREATE INDEX IF NOT EXISTS idx_user_roles_is_admin ON user_roles(is_admin);

-- Enable RLS on user_roles

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing user_roles policies if they exist

DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;

DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;

DROP POLICY IF EXISTS "Allow initial admin setup" ON user_roles;

-- User Roles Policies

CREATE POLICY "Admins can view all user roles"

  ON user_roles FOR SELECT

  USING (

    EXISTS (

      SELECT 1 FROM user_roles ur

      WHERE ur.user_id = auth.uid() AND ur.is_admin = true

    )

  );

CREATE POLICY "Users can view their own role"

  ON user_roles FOR SELECT

  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update user roles"

  ON user_roles FOR UPDATE

  USING (

    EXISTS (

      SELECT 1 FROM user_roles ur

      WHERE ur.user_id = auth.uid() AND ur.is_admin = true

    )

  );

CREATE POLICY "Allow initial admin setup"

  ON user_roles FOR INSERT

  WITH CHECK (true); -- Allow authenticated users to insert for initial setup

-- Journal Entries Table (Daily Journal)

CREATE TABLE IF NOT EXISTS journal_entries (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  date DATE NOT NULL,

  title TEXT,

  accomplishments TEXT[] DEFAULT '{}',

  conversations TEXT[] DEFAULT '{}',

  ideas TEXT[] DEFAULT '{}',

  notes TEXT,

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Tasks Table (Task Management)

CREATE TABLE IF NOT EXISTS tasks (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  description TEXT,

  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),

  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  project TEXT,

  due_date DATE,

  tags TEXT[] DEFAULT '{}',

  checklist JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Ideas Table (Idea Board)

CREATE TABLE IF NOT EXISTS ideas (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  description TEXT,

  category TEXT,

  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'considering', 'planned', 'in_progress', 'completed', 'archived')),

  tags TEXT[] DEFAULT '{}',

  related_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Help Articles Table (Help Center)

CREATE TABLE IF NOT EXISTS help_articles (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  content TEXT NOT NULL,

  category TEXT NOT NULL,

  tags TEXT[] DEFAULT '{}',

  views INTEGER NOT NULL DEFAULT 0,

  helpful INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Code Snippets Table (Developer Tools)

CREATE TABLE IF NOT EXISTS code_snippets (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  code TEXT NOT NULL,

  language TEXT NOT NULL DEFAULT 'javascript',

  description TEXT,

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- ============================================

-- INDEXES FOR PERFORMANCE

-- ============================================

-- Platform Subscription Indexes

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_user_id ON platform_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_tier ON platform_subscriptions(tier);

-- Tool Limits Indexes

CREATE INDEX IF NOT EXISTS idx_tool_limits_tool_tier ON tool_limits(tool_id, tier);

-- Tool Usage Indexes

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool ON tool_usage(user_id, tool_id);

CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);

-- Blog Posts Indexes

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);

-- Products Indexes

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Affiliates Indexes

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);

CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);

CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

-- Product Costs Table

CREATE TABLE IF NOT EXISTS product_costs (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id TEXT NOT NULL, -- Fourthwall product ID or local product ID

  variant_id TEXT, -- For Fourthwall variants

  source TEXT NOT NULL CHECK (source IN ('fourthwall', 'local')),

  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(product_id, variant_id, source)

);

-- KING MIDAS Daily Stats Table

CREATE TABLE IF NOT EXISTS king_midas_daily_stats (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  profit_generated DECIMAL(10, 2) NOT NULL DEFAULT 0,

  rank INTEGER,

  pool_share DECIMAL(10, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(affiliate_id, date)

);

-- KING MIDAS Payouts Table

CREATE TABLE IF NOT EXISTS king_midas_payouts (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  rank INTEGER,

  pool_amount DECIMAL(10, 2) NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Affiliate Commissions Indexes

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_source ON affiliate_commissions(source);

-- Product Costs Indexes

CREATE INDEX IF NOT EXISTS idx_product_costs_product ON product_costs(product_id, variant_id, source);

-- KING MIDAS Indexes

CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_affiliate ON king_midas_daily_stats(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_date ON king_midas_daily_stats(date DESC);

CREATE INDEX IF NOT EXISTS idx_king_midas_daily_stats_rank ON king_midas_daily_stats(date, rank);

CREATE INDEX IF NOT EXISTS idx_king_midas_payouts_affiliate ON king_midas_payouts(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_king_midas_payouts_date ON king_midas_payouts(date DESC);

-- Journal Entries Indexes

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);

-- Tasks Indexes

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

-- Ideas Indexes

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);

CREATE INDEX IF NOT EXISTS idx_ideas_priority ON ideas(priority);

CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);

CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);

-- Help Articles Indexes

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);

CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON help_articles USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_help_articles_views ON help_articles(views DESC);

-- Code Snippets Indexes

CREATE INDEX IF NOT EXISTS idx_code_snippets_language ON code_snippets(language);

CREATE INDEX IF NOT EXISTS idx_code_snippets_tags ON code_snippets USING GIN(tags);

-- ============================================

-- EXPOSE TABLES VIA REST API (PUBLICATION)

-- ============================================

-- Add tables to supabase publication so they're accessible via REST API
-- This is REQUIRED for Supabase client to work properly

DO $$
BEGIN
  -- Check if 'supabase' publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase') THEN
    -- Add all tables to supabase publication (for REST API access)
    -- Note: We check if table is already in publication before adding to avoid errors
    
    -- platform_subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'platform_subscriptions'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE platform_subscriptions;
    END IF;
    
    -- tool_limits
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'tool_limits'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE tool_limits;
    END IF;
    
    -- tool_usage
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'tool_usage'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE tool_usage;
    END IF;
    
    -- blog_posts
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'blog_posts'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE blog_posts;
    END IF;
    
    -- products
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'products'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE products;
    END IF;
    
    -- affiliates
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'affiliates'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE affiliates;
    END IF;
    
    -- affiliate_commissions
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'affiliate_commissions'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE affiliate_commissions;
    END IF;
    
    -- product_costs
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'product_costs'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE product_costs;
    END IF;
    
    -- king_midas_daily_stats
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'king_midas_daily_stats'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE king_midas_daily_stats;
    END IF;
    
    -- king_midas_payouts
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'king_midas_payouts'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE king_midas_payouts;
    END IF;
    
    -- user_roles
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'user_roles'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE user_roles;
    END IF;
    
    -- journal_entries
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'journal_entries'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE journal_entries;
    END IF;
    
    -- tasks
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'tasks'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE tasks;
    END IF;
    
    -- ideas
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'ideas'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE ideas;
    END IF;
    
    -- help_articles
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'help_articles'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE help_articles;
    END IF;
    
    -- code_snippets
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'code_snippets'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE code_snippets;
    END IF;
    
    RAISE NOTICE '✅ Added all tables to supabase publication';
  ELSE
    RAISE NOTICE '⚠️ supabase publication does not exist - tables may not be accessible via REST API';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Note: %', SQLERRM;
END $$;

-- ============================================

-- ROW LEVEL SECURITY (RLS) POLICIES

-- ============================================

-- Enable RLS on all tables

ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE tool_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;

ALTER TABLE king_midas_daily_stats ENABLE ROW LEVEL SECURITY;

ALTER TABLE king_midas_payouts ENABLE ROW LEVEL SECURITY;

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;

-- Platform Subscriptions Policies

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON platform_subscriptions;

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON platform_subscriptions;

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON platform_subscriptions;

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON platform_subscriptions;

CREATE POLICY "Users can view their own subscriptions"

  ON platform_subscriptions FOR SELECT

  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"

  ON platform_subscriptions FOR INSERT

  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"

  ON platform_subscriptions FOR UPDATE

  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"

  ON platform_subscriptions FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Tool Limits Policies

DROP POLICY IF EXISTS "Anyone can view tool limits" ON tool_limits;

CREATE POLICY "Anyone can view tool limits"

  ON tool_limits FOR SELECT

  USING (true);

-- Tool Usage Policies

DROP POLICY IF EXISTS "Users can view their own usage" ON tool_usage;

DROP POLICY IF EXISTS "Users can insert their own usage" ON tool_usage;

DROP POLICY IF EXISTS "Admins can manage all usage" ON tool_usage;

CREATE POLICY "Users can view their own usage"

  ON tool_usage FOR SELECT

  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"

  ON tool_usage FOR INSERT

  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all usage"

  ON tool_usage FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Blog Posts Policies

DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;

DROP POLICY IF EXISTS "Admins can manage blog posts" ON blog_posts;

DROP POLICY IF EXISTS "Authors can manage their own blog posts" ON blog_posts;

CREATE POLICY "Public can read published blog posts"

  ON blog_posts FOR SELECT

  USING (status = 'published');

CREATE POLICY "Admins can manage blog posts"

  ON blog_posts FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

CREATE POLICY "Authors can manage their own blog posts"

  ON blog_posts FOR ALL

  USING (author_id = auth.uid());

-- Products Policies

DROP POLICY IF EXISTS "Public can read active products" ON products;

DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Public can read active products"

  ON products FOR SELECT

  USING (status = 'active');

CREATE POLICY "Admins can manage products"

  ON products FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Affiliates Policies

DROP POLICY IF EXISTS "Users can read their own affiliate data" ON affiliates;

DROP POLICY IF EXISTS "Admins can manage affiliates" ON affiliates;

CREATE POLICY "Users can read their own affiliate data"

  ON affiliates FOR SELECT

  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage affiliates"

  ON affiliates FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Affiliate Commissions Policies

DROP POLICY IF EXISTS "Affiliates can read their own commissions" ON affiliate_commissions;

DROP POLICY IF EXISTS "Admins can manage affiliate commissions" ON affiliate_commissions;

CREATE POLICY "Affiliates can read their own commissions"

  ON affiliate_commissions FOR SELECT

  USING (

    EXISTS (

      SELECT 1 FROM affiliates

      WHERE affiliates.id = affiliate_commissions.affiliate_id

      AND affiliates.user_id = auth.uid()

    )

  );

CREATE POLICY "Admins can manage affiliate commissions"

  ON affiliate_commissions FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Product Costs Policies

DROP POLICY IF EXISTS "Admins can manage product costs" ON product_costs;

CREATE POLICY "Admins can manage product costs"

  ON product_costs FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- KING MIDAS Daily Stats Policies

DROP POLICY IF EXISTS "Affiliates can read their own KING MIDAS stats" ON king_midas_daily_stats;

DROP POLICY IF EXISTS "Admins can manage KING MIDAS stats" ON king_midas_daily_stats;

CREATE POLICY "Affiliates can read their own KING MIDAS stats"

  ON king_midas_daily_stats FOR SELECT

  USING (

    EXISTS (

      SELECT 1 FROM affiliates

      WHERE affiliates.id = king_midas_daily_stats.affiliate_id

      AND affiliates.user_id = auth.uid()

    )

  );

CREATE POLICY "Admins can manage KING MIDAS stats"

  ON king_midas_daily_stats FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- KING MIDAS Payouts Policies

DROP POLICY IF EXISTS "Affiliates can read their own KING MIDAS payouts" ON king_midas_payouts;

DROP POLICY IF EXISTS "Admins can manage KING MIDAS payouts" ON king_midas_payouts;

CREATE POLICY "Affiliates can read their own KING MIDAS payouts"

  ON king_midas_payouts FOR SELECT

  USING (

    EXISTS (

      SELECT 1 FROM affiliates

      WHERE affiliates.id = king_midas_payouts.affiliate_id

      AND affiliates.user_id = auth.uid()

    )

  );

CREATE POLICY "Admins can manage KING MIDAS payouts"

  ON king_midas_payouts FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Journal Entries Policies

-- Drop existing policies if they exist

DROP POLICY IF EXISTS "Admins can manage journal entries" ON journal_entries;

-- Admins can do everything

CREATE POLICY "Admins can manage journal entries"

  ON journal_entries FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Tasks Policies

-- Drop existing policies if they exist

DROP POLICY IF EXISTS "Admins can manage tasks" ON tasks;

DROP POLICY IF EXISTS "Users can read assigned tasks" ON tasks;

-- Admins can do everything

CREATE POLICY "Admins can manage tasks"

  ON tasks FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Assignees can read their own tasks

CREATE POLICY "Users can read assigned tasks"

  ON tasks FOR SELECT

  USING (assignee_id = auth.uid());

-- Ideas Policies

-- Drop existing policies if they exist

DROP POLICY IF EXISTS "Admins can manage ideas" ON ideas;

-- Admins can do everything

CREATE POLICY "Admins can manage ideas"

  ON ideas FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Help Articles Policies

-- Drop existing policies if they exist

DROP POLICY IF EXISTS "Public can read help articles" ON help_articles;

DROP POLICY IF EXISTS "Admins can manage help articles" ON help_articles;

-- Public can read help articles

CREATE POLICY "Public can read help articles"

  ON help_articles FOR SELECT

  USING (true);

-- Admins can do everything

CREATE POLICY "Admins can manage help articles"

  ON help_articles FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- Code Snippets Policies

-- Drop existing policies if they exist

DROP POLICY IF EXISTS "Admins can manage code snippets" ON code_snippets;

-- Admins can do everything

CREATE POLICY "Admins can manage code snippets"

  ON code_snippets FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM user_roles

      WHERE user_roles.user_id = auth.uid()

      AND user_roles.is_admin = true

    )

  );

-- ============================================

-- FUNCTIONS AND TRIGGERS

-- ============================================

-- Function to update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()

RETURNS TRIGGER AS $$

BEGIN

  NEW.updated_at = NOW();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;

-- Triggers for updated_at

-- Drop existing triggers if they exist

DROP TRIGGER IF EXISTS update_platform_subscriptions_updated_at ON platform_subscriptions;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;

DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

DROP TRIGGER IF EXISTS update_ideas_updated_at ON ideas;

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON help_articles;

DROP TRIGGER IF EXISTS update_code_snippets_updated_at ON code_snippets;

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;

CREATE TRIGGER update_platform_subscriptions_updated_at

  BEFORE UPDATE ON platform_subscriptions

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at

  BEFORE UPDATE ON blog_posts

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at

  BEFORE UPDATE ON products

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at

  BEFORE UPDATE ON affiliates

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at

  BEFORE UPDATE ON journal_entries

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at

  BEFORE UPDATE ON tasks

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at

  BEFORE UPDATE ON ideas

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_help_articles_updated_at

  BEFORE UPDATE ON help_articles

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_snippets_updated_at

  BEFORE UPDATE ON code_snippets

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at

  BEFORE UPDATE ON user_roles

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_costs_updated_at ON product_costs;

DROP TRIGGER IF EXISTS update_king_midas_daily_stats_updated_at ON king_midas_daily_stats;

CREATE TRIGGER update_product_costs_updated_at

  BEFORE UPDATE ON product_costs

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_king_midas_daily_stats_updated_at

  BEFORE UPDATE ON king_midas_daily_stats

  FOR EACH ROW

  EXECUTE FUNCTION update_updated_at_column();

-- ============================================

-- DEFAULT DATA

-- ============================================

-- Insert default tool limits

INSERT INTO tool_limits (tool_id, tier, limit_type, limit_value) VALUES

  -- TikTok Downloader limits

  ('tiktok', 'free', 'daily_downloads', 5),

  ('tiktok', 'premium', 'daily_downloads', NULL), -- unlimited

  ('tiktok', 'pro', 'daily_downloads', NULL)

ON CONFLICT (tool_id, tier, limit_type) DO NOTHING;

-- Function to increment help article views

CREATE OR REPLACE FUNCTION increment_help_article_views(article_id UUID)

RETURNS void AS $$

BEGIN

  UPDATE help_articles

  SET views = views + 1

  WHERE id = article_id;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark help article as helpful

CREATE OR REPLACE FUNCTION mark_help_article_helpful(article_id UUID)

RETURNS void AS $$

BEGIN

  UPDATE help_articles

  SET helpful = helpful + 1

  WHERE id = article_id;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment affiliate clicks

CREATE OR REPLACE FUNCTION increment_affiliate_clicks(affiliate_id UUID)

RETURNS void AS $$

BEGIN

  UPDATE affiliates

  SET total_clicks = total_clicks + 1,

      updated_at = NOW()

  WHERE id = affiliate_id;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily KING MIDAS pool

CREATE OR REPLACE FUNCTION calculate_daily_king_midas_pool(target_date DATE)

RETURNS DECIMAL(10, 2) AS $$

DECLARE

  total_pool DECIMAL(10, 2);

BEGIN

  SELECT COALESCE(SUM(profit_generated * 0.08), 0)

  INTO total_pool

  FROM king_midas_daily_stats

  WHERE date = target_date;

  

  RETURN total_pool;

END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================

-- SAMPLE DATA (Optional)

-- ============================================

-- Insert sample help articles (only if they don't already exist)

INSERT INTO help_articles (title, content, category, tags)
SELECT * FROM (VALUES
  ('Getting Started with Admin Dashboard', 'Welcome to the admin dashboard! This is your central hub for managing your platform.', 'Getting Started', ARRAY['dashboard', 'getting-started']),
  ('How to Create a Blog Post', 'Learn how to create and publish blog posts using the blog management interface.', 'Blog Management', ARRAY['blog', 'content']),
  ('Managing Products', 'Add, edit, and manage products in your store catalog.', 'Products', ARRAY['products', 'e-commerce'])
) AS v(title, content, category, tags)
WHERE NOT EXISTS (
  SELECT 1 FROM help_articles WHERE help_articles.title = v.title
);
