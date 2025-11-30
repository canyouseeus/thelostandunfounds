-- Move "Building a Creative Brand That Rewards People for Life" post to Book Club
-- This adds a subdomain to make it part of the book club collection
-- Also assigns it to thelostandunfounds@gmail.com user
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  admin_user_id UUID;
  has_author_id_field BOOLEAN;
  has_user_id_field BOOLEAN;
  user_column_name TEXT;
BEGIN
  -- Check which column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'author_id'
  ) INTO has_author_id_field;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'user_id'
  ) INTO has_user_id_field;

  -- Determine which column name to use
  IF has_user_id_field THEN
    user_column_name := 'user_id';
  ELSIF has_author_id_field THEN
    user_column_name := 'author_id';
  ELSE
    user_column_name := NULL;
  END IF;

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

  -- Update the post with subdomain and user assignment
  IF user_column_name IS NOT NULL AND admin_user_id IS NOT NULL THEN
    -- Use dynamic SQL to update with the correct column name
    EXECUTE format('
      UPDATE blog_posts
      SET subdomain = %L, %I = %L
      WHERE slug = %L
        AND (subdomain IS NULL OR subdomain = %L)
    ', 'thelostandunfounds', user_column_name, admin_user_id, 
        'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds', '');
    
    RAISE NOTICE 'Post updated with subdomain and assigned to user: %', admin_user_id;
  ELSIF admin_user_id IS NULL THEN
    -- If no user found, just update subdomain
    UPDATE blog_posts
    SET subdomain = 'thelostandunfounds'
    WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds'
      AND (subdomain IS NULL OR subdomain = '');
    
    RAISE WARNING 'User not found. Post updated with subdomain only.';
  ELSE
    -- If no user column, just update subdomain
    UPDATE blog_posts
    SET subdomain = 'thelostandunfounds'
    WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds'
      AND (subdomain IS NULL OR subdomain = '');
    
    RAISE WARNING 'No user_id/author_id column found. Post updated with subdomain only.';
  END IF;
END $$;

-- Verify the update
SELECT 
  id,
  title,
  slug,
  subdomain,
  author_id,
  user_id,
  published,
  published_at
FROM blog_posts
WHERE slug = 'building-a-creative-brand-that-rewards-people-for-life-lessons-that-shaped-the-lost-and-unfounds';
