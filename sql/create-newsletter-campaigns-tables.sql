-- Create newsletter campaigns and logs tables
-- Run this in Supabase SQL Editor

-- 1. Campaigns Table
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  total_subscribers INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Send Logs Table
CREATE TABLE IF NOT EXISTS public.newsletter_send_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON public.newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_at ON public.newsletter_campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_campaign_id ON public.newsletter_send_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_send_logs_subscriber_email ON public.newsletter_send_logs(subscriber_email);

-- 4. RLS Policies
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_send_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role (backend) full access
CREATE POLICY "Service role has full access to campaigns"
  ON public.newsletter_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to logs"
  ON public.newsletter_send_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated admins (if needed, adjust based on admin roles) to view
-- For now, we'll assume admins have service role or we rely on dashboard access
-- If you access this from the frontend Admin dashboard, you might need:
CREATE POLICY "Admins can view campaigns"
  ON public.newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (true); -- Refine this if you have an is_admin() function

-- 5. Updated At Trigger
CREATE TRIGGER update_newsletter_campaigns_updated_at
  BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
