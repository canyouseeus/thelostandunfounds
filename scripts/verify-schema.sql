-- Verify schema was created successfully

-- Check if user_profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
) as user_profiles_exists;

-- Check if king_midas_hourly_rankings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'king_midas_hourly_rankings'
) as hourly_rankings_exists;

-- Check storage buckets
SELECT id, name, public FROM storage.buckets WHERE id IN ('avatars', 'banners');

-- Check user_profiles columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Check king_midas_hourly_rankings columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'king_midas_hourly_rankings' 
ORDER BY ordinal_position;



