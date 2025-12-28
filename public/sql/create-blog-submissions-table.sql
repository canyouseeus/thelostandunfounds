-- Blog Post Submissions Schema for THE LOST ARCHIVES
-- Run this in Supabase SQL Editor

-- Blog post submissions table
CREATE TABLE IF NOT EXISTS blog_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  subdomain TEXT, -- User subdomain for their blog (e.g., username from email)
  amazon_affiliate_links JSONB DEFAULT '[]', -- Array of affiliate link objects: [{"book_title": "...", "link": "https://..."}]
  amazon_storefront_id TEXT, -- Amazon Associates Storefront ID (internal tracking only)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  admin_notes TEXT, -- Admin can add notes during review
  rejected_reason TEXT, -- Reason for rejection if rejected
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who reviewed
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_submissions_status ON blog_submissions(status);
CREATE INDEX IF NOT EXISTS idx_blog_submissions_created_at ON blog_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_submissions_author_email ON blog_submissions(author_email);

-- Enable Row Level Security
ALTER TABLE blog_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Anyone can submit articles" ON blog_submissions;
DROP POLICY IF EXISTS "Submitters can view their own submissions" ON blog_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON blog_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON blog_submissions;

-- Policy: Anyone can insert submissions (public submission form)
CREATE POLICY "Anyone can submit articles"
  ON blog_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Submitters can view their own submissions
CREATE POLICY "Submitters can view their own submissions"
  ON blog_submissions
  FOR SELECT
  USING (true); -- Allow anyone to view (for transparency), or restrict to email match if preferred

-- Policy: Only admins can update submissions (for review/approval)
CREATE POLICY "Admins can update submissions"
  ON blog_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (email = 'admin@thelostandunfounds.com' OR email = 'thelostandunfounds@gmail.com')
    )
  );

-- Policy: Only admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON blog_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (email = 'admin@thelostandunfounds.com' OR email = 'thelostandunfounds@gmail.com')
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for blog_submissions
DROP TRIGGER IF EXISTS update_blog_submissions_updated_at ON blog_submissions;
CREATE TRIGGER update_blog_submissions_updated_at
  BEFORE UPDATE ON blog_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_submissions_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON blog_submissions TO anon, authenticated;
GRANT UPDATE, DELETE ON blog_submissions TO authenticated;

-- Add to publication for realtime (optional)
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS, so we check first
DO $$
BEGIN
  -- Check if table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'blog_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blog_submissions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
