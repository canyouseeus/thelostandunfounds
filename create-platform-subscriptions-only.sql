-- Create ONLY platform_subscriptions table first
-- Run this to test if table creation works

-- Drop if exists (for testing)
DROP TABLE IF EXISTS platform_subscriptions CASCADE;

-- Create platform_subscriptions table
CREATE TABLE platform_subscriptions (
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

-- Create index
CREATE INDEX idx_platform_subscriptions_user_id ON platform_subscriptions(user_id);

-- Enable RLS
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own subscriptions"
  ON platform_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Add to publication (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase' AND tablename = 'platform_subscriptions'
    ) THEN
      ALTER PUBLICATION supabase ADD TABLE platform_subscriptions;
    END IF;
  END IF;
END $$;

-- Verify table was created
SELECT 
  'SUCCESS: platform_subscriptions table created!' as status,
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'platform_subscriptions'
AND table_schema = 'public';


