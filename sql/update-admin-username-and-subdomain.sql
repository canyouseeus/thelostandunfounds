-- Update username for thelostandunfounds@gmail.com and set subdomain to mrjetstream
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  admin_user_id UUID;
  current_subdomain TEXT;
BEGIN
  -- Get admin user ID (thelostandunfounds@gmail.com)
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'thelostandunfounds@gmail.com'
  LIMIT 1;

  -- If not found, try alternative admin email
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@thelostandunfounds.com'
    LIMIT 1;
  END IF;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User thelostandunfounds@gmail.com not found';
  END IF;

  -- Update username in user_metadata
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('author_name', 'THE LOST+UNFOUNDS')
  WHERE id = admin_user_id;

  -- Check if user_subdomains table exists and has a subdomain for this user
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_subdomains'
  ) THEN
    -- Check current subdomain
    SELECT subdomain INTO current_subdomain
    FROM user_subdomains
    WHERE user_id = admin_user_id;

    -- Insert or update subdomain
    IF current_subdomain IS NULL THEN
      -- Insert new subdomain
      INSERT INTO user_subdomains (user_id, subdomain)
      VALUES (admin_user_id, 'mrjetstream')
      ON CONFLICT (user_id) DO UPDATE SET subdomain = 'mrjetstream';
      
      RAISE NOTICE 'Subdomain mrjetstream created for user %', admin_user_id;
    ELSE
      -- Update existing subdomain
      UPDATE user_subdomains
      SET subdomain = 'mrjetstream'
      WHERE user_id = admin_user_id;
      
      RAISE NOTICE 'Subdomain updated from % to mrjetstream for user %', current_subdomain, admin_user_id;
    END IF;
  ELSE
    RAISE WARNING 'user_subdomains table does not exist. Please run create-user-subdomains-table.sql first.';
  END IF;

  -- Update the "Building a Creative Brand" post to use mrjetstream subdomain
  UPDATE blog_posts
  SET subdomain = 'mrjetstream'
  WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds'
    AND (author_id = admin_user_id OR user_id = admin_user_id);

  RAISE NOTICE 'Username updated to THE LOST+UNFOUNDS and subdomain set to mrjetstream for user %', admin_user_id;
END $$;

-- Verify the updates
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'author_name' as author_name,
  us.subdomain
FROM auth.users u
LEFT JOIN user_subdomains us ON us.user_id = u.id
WHERE u.email = 'thelostandunfounds@gmail.com';

-- Verify the blog post subdomain
SELECT 
  id,
  title,
  slug,
  subdomain,
  author_id,
  user_id
FROM blog_posts
WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds';
