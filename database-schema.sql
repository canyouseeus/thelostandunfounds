-- Unified Platform Database Schema
-- Run this in Supabase SQL Editor

-- Platform subscriptions table (shared across all tools)
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  paypal_subscription_id TEXT UNIQUE,
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tool limits configuration (defines limits per tool per tier)
CREATE TABLE IF NOT EXISTS tool_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  limit_type TEXT NOT NULL, -- 'daily_downloads', 'monthly_api_calls', etc.
  limit_value INTEGER, -- NULL = unlimited
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tool_id, tier, limit_type)
);

-- Tool usage tracking (tracks user actions across all tools)
CREATE TABLE IF NOT EXISTS tool_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id TEXT NOT NULL, -- 'tiktok', etc.
  action TEXT NOT NULL, -- 'download', 'convert', 'api_call', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expose tables via PostgREST API (required for Supabase REST API)
-- Note: These commands may fail if tables are already in publication - that's OK
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS platform_subscriptions;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS tool_limits;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS tool_usage;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Grant permissions to anon and authenticated roles (required for REST API access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON platform_subscriptions TO anon, authenticated;
GRANT ALL ON tool_limits TO anon, authenticated;
GRANT ALL ON tool_usage TO anon, authenticated;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_user_id ON platform_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tool_limits_tool_tier ON tool_limits(tool_id, tier);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool ON tool_usage(user_id, tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);

-- Insert default tool limits
INSERT INTO tool_limits (tool_id, tier, limit_type, limit_value) VALUES
  -- TikTok Downloader limits
  ('tiktok', 'free', 'daily_downloads', 5),
  ('tiktok', 'premium', 'daily_downloads', NULL), -- unlimited
  ('tiktok', 'pro', 'daily_downloads', NULL)
ON CONFLICT (tool_id, tier, limit_type) DO NOTHING;

-- Row Level Security (RLS) Policies

-- Platform subscriptions: Users can only see their own subscriptions
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON platform_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON platform_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON platform_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
  ON platform_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON platform_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON platform_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Tool limits: Public read access (no sensitive data)
ALTER TABLE tool_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view tool limits" ON tool_limits;

CREATE POLICY "Anyone can view tool limits"
  ON tool_limits
  FOR SELECT
  USING (true);

-- Tool usage: Users can only see their own usage
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own usage" ON tool_usage;
DROP POLICY IF EXISTS "Users can insert their own usage" ON tool_usage;

CREATE POLICY "Users can view their own usage"
  ON tool_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON tool_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for platform_subscriptions
DROP TRIGGER IF EXISTS update_platform_subscriptions_updated_at ON platform_subscriptions;
CREATE TRIGGER update_platform_subscriptions_updated_at
  BEFORE UPDATE ON platform_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
