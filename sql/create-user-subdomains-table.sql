-- User Subdomains Table
-- Stores each user's custom subdomain (one per user, set once during signup)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_subdomains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subdomain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subdomains_user_id ON user_subdomains(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subdomains_subdomain ON user_subdomains(subdomain);

-- Enable Row Level Security
ALTER TABLE user_subdomains ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subdomain
CREATE POLICY "Users can view their own subdomain"
  ON user_subdomains
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subdomain (only once)
CREATE POLICY "Users can insert their own subdomain"
  ON user_subdomains
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot update their subdomain (set once, permanent)
-- Only admins can update if needed
CREATE POLICY "Admins can update subdomains"
  ON user_subdomains
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

-- Policy: Anyone can check if a subdomain is available (for validation)
CREATE POLICY "Anyone can check subdomain availability"
  ON user_subdomains
  FOR SELECT
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subdomains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_subdomains
DROP TRIGGER IF EXISTS update_user_subdomains_updated_at ON user_subdomains;
CREATE TRIGGER update_user_subdomains_updated_at
  BEFORE UPDATE ON user_subdomains
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subdomains_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON user_subdomains TO anon, authenticated;
GRANT UPDATE ON user_subdomains TO authenticated;

-- Add to publication for realtime (optional)
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS, so we check first
DO $$
BEGIN
  -- Check if table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_subdomains'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_subdomains;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
