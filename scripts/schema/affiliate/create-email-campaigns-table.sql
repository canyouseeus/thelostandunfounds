-- ============================================
-- AFFILIATE EMAIL CAMPAIGNS TABLE
-- ============================================
-- Tracks email campaigns sent to affiliates
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS affiliate_email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  emails_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_email_campaigns_status ON affiliate_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_email_campaigns_created_at ON affiliate_email_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_email_campaigns_sent_at ON affiliate_email_campaigns(sent_at);

-- RLS Policies
ALTER TABLE affiliate_email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage affiliate email campaigns" ON affiliate_email_campaigns;
CREATE POLICY "Admins can manage affiliate email campaigns"
  ON affiliate_email_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage affiliate email campaigns" ON affiliate_email_campaigns;
CREATE POLICY "Service role can manage affiliate email campaigns"
  ON affiliate_email_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify table creation
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'affiliate_email_campaigns'
ORDER BY policyname;














