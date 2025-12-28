-- Newsletter Campaigns Table
-- Run this in Supabase SQL Editor
-- Tracks newsletter campaigns and their send status

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_subscribers INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON public.newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_sent_at ON public.newsletter_campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created_at ON public.newsletter_campaigns(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can insert campaigns
CREATE POLICY "Allow admins to insert newsletter campaigns"
  ON public.newsletter_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can read campaigns
CREATE POLICY "Allow admins to read newsletter campaigns"
  ON public.newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Only admins can update campaigns
CREATE POLICY "Allow admins to update newsletter campaigns"
  ON public.newsletter_campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@thelostandunfounds.com'
    )
  );

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access to newsletter campaigns"
  ON public.newsletter_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Expose table via PostgREST API
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_campaigns;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Add updated_at trigger
CREATE TRIGGER update_newsletter_campaigns_updated_at
  BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
