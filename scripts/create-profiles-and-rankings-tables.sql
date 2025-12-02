-- User Profiles and King Midas Hourly Rankings Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- USER PROFILES TABLE
-- ============================================

-- User profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view profiles (public)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON user_profiles;
CREATE POLICY "Anyone can view user profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_profiles TO anon, authenticated;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- KING MIDAS HOURLY RANKINGS TABLE
-- ============================================

-- Track hourly snapshots of rankings for change detection
CREATE TABLE IF NOT EXISTS king_midas_hourly_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  rank INTEGER NOT NULL,
  profit_generated DECIMAL(10, 2) NOT NULL DEFAULT 0,
  rank_change INTEGER DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_king_midas_hourly_rankings_affiliate_id ON king_midas_hourly_rankings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_king_midas_hourly_rankings_recorded_at ON king_midas_hourly_rankings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_king_midas_hourly_rankings_rank ON king_midas_hourly_rankings(rank);

-- RLS Policies
ALTER TABLE king_midas_hourly_rankings ENABLE ROW LEVEL SECURITY;

-- Anyone can view hourly rankings (public leaderboard data)
DROP POLICY IF EXISTS "Anyone can view hourly rankings" ON king_midas_hourly_rankings;
CREATE POLICY "Anyone can view hourly rankings"
  ON king_midas_hourly_rankings
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON king_midas_hourly_rankings TO anon, authenticated;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create banners bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES FOR AVATARS
-- ============================================

-- Anyone can view avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- STORAGE POLICIES FOR BANNERS
-- ============================================

-- Anyone can view banners
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;
CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

-- Authenticated users can upload banners
DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own banners
DROP POLICY IF EXISTS "Users can update their own banners" ON storage.objects;
CREATE POLICY "Users can update their own banners"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own banners
DROP POLICY IF EXISTS "Users can delete their own banners" ON storage.objects;
CREATE POLICY "Users can delete their own banners"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_profiles IS 'Extended user profile information with avatar and banner images';
COMMENT ON TABLE king_midas_hourly_rankings IS 'Hourly snapshots of King Midas rankings for tracking rank changes';



