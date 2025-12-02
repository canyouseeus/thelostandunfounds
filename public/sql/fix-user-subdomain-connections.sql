-- Fix User-Subdomain Connections
-- This script links users to their subdomains based on email matching
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  linked_count INTEGER := 0;
  created_count INTEGER := 0;
  updated_count INTEGER := 0;
  subdomain_record RECORD;
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Starting user-subdomain connection fix...';

  -- Step 1: Find subdomains in blog_submissions that don't have user_subdomains entries
  -- Match them to users by email
  FOR subdomain_record IN
    SELECT DISTINCT 
      bs.subdomain,
      bs.author_email,
      bs.author_name,
      MIN(bs.created_at) as first_used_at
    FROM blog_submissions bs
    WHERE bs.subdomain IS NOT NULL
      AND bs.author_email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_subdomains us 
        WHERE us.subdomain = bs.subdomain
      )
    GROUP BY bs.subdomain, bs.author_email, bs.author_name
    ORDER BY first_used_at
  LOOP
    -- Try to find user by email
    SELECT id, email INTO user_record
    FROM auth.users
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(subdomain_record.author_email))
    LIMIT 1;

    IF user_record.id IS NOT NULL THEN
      -- Check if user already has a different subdomain
      IF EXISTS (
        SELECT 1 FROM user_subdomains 
        WHERE user_id = user_record.id
      ) THEN
        RAISE NOTICE 'User % already has a subdomain. Skipping subdomain %', user_record.email, subdomain_record.subdomain;
      ELSE
        -- Check if subdomain is already taken by another user
        IF NOT EXISTS (
          SELECT 1 FROM user_subdomains 
          WHERE subdomain = subdomain_record.subdomain
        ) THEN
          -- Create user_subdomains entry
          INSERT INTO user_subdomains (user_id, subdomain, created_at)
          VALUES (user_record.id, subdomain_record.subdomain, subdomain_record.first_used_at)
          ON CONFLICT (user_id) DO NOTHING;
          
          IF FOUND THEN
            created_count := created_count + 1;
            RAISE NOTICE 'Linked user % to subdomain %', user_record.email, subdomain_record.subdomain;
          END IF;
        ELSE
          RAISE NOTICE 'Subdomain % is already taken. Skipping for user %', subdomain_record.subdomain, user_record.email;
        END IF;
      END IF;
    ELSE
      RAISE WARNING 'No user found for email % (subdomain: %). Manual intervention may be needed.', 
        subdomain_record.author_email, subdomain_record.subdomain;
    END IF;
  END LOOP;

  -- Step 2: Find subdomains in blog_posts that don't have user_subdomains entries
  -- Match them to users by author_id or user_id
  FOR subdomain_record IN
    SELECT DISTINCT 
      bp.subdomain,
      bp.author_id,
      bp.user_id,
      MIN(bp.created_at) as first_used_at
    FROM blog_posts bp
    WHERE bp.subdomain IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_subdomains us 
        WHERE us.subdomain = bp.subdomain
      )
    GROUP BY bp.subdomain, bp.author_id, bp.user_id
    ORDER BY first_used_at
  LOOP
    -- Try to find user by author_id or user_id
    DECLARE
      target_user_id UUID;
    BEGIN
      target_user_id := COALESCE(subdomain_record.author_id, subdomain_record.user_id);
      
      IF target_user_id IS NOT NULL THEN
        -- Verify user exists and get email
        SELECT id, email INTO user_record
        FROM auth.users
        WHERE id = target_user_id
        LIMIT 1;

        IF user_record.id IS NOT NULL AND user_record.email IS NOT NULL THEN
        -- Check if user already has a different subdomain
        IF EXISTS (
          SELECT 1 FROM user_subdomains 
          WHERE user_id = user_record.id
        ) THEN
          RAISE NOTICE 'User % already has a subdomain. Skipping subdomain %', user_record.email, subdomain_record.subdomain;
        ELSE
          -- Check if subdomain is already taken by another user
          IF NOT EXISTS (
            SELECT 1 FROM user_subdomains 
            WHERE subdomain = subdomain_record.subdomain
          ) THEN
            -- Create user_subdomains entry
            INSERT INTO user_subdomains (user_id, subdomain, created_at)
            VALUES (user_record.id, subdomain_record.subdomain, subdomain_record.first_used_at)
            ON CONFLICT (user_id) DO NOTHING;
            
            IF FOUND THEN
              created_count := created_count + 1;
              RAISE NOTICE 'Linked user % to subdomain % (from blog_posts)', user_record.email, subdomain_record.subdomain;
            END IF;
          ELSE
            RAISE NOTICE 'Subdomain % is already taken. Skipping for user %', subdomain_record.subdomain, user_record.email;
          END IF;
        END IF;
      END IF;
    END;
  END LOOP;

  -- Step 3: Fix any user_subdomains entries that point to wrong users
  -- (e.g., if subdomain was manually created but user_id doesn't match the actual owner)
  FOR subdomain_record IN
    SELECT 
      us.id,
      us.user_id as current_user_id,
      us.subdomain,
      u.email as current_user_email
    FROM user_subdomains us
    LEFT JOIN auth.users u ON u.id = us.user_id
    WHERE us.subdomain IN ('plutonium', 'mrjetstream')
  LOOP
    -- Try to find the correct user by matching email from blog_submissions
    DECLARE
      author_email_found TEXT;
    BEGIN
      SELECT DISTINCT bs.author_email INTO author_email_found
      FROM blog_submissions bs
      WHERE bs.subdomain = subdomain_record.subdomain
        AND bs.author_email IS NOT NULL
      LIMIT 1;

      IF author_email_found IS NOT NULL THEN
        -- Find user by email
        SELECT id, email INTO user_record
        FROM auth.users
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(author_email_found))
        LIMIT 1;

        IF user_record.id IS NOT NULL AND user_record.id != subdomain_record.current_user_id THEN
        -- Update to correct user
        UPDATE user_subdomains
        SET user_id = user_record.id
        WHERE id = subdomain_record.id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated subdomain % from user % to user %', 
          subdomain_record.subdomain, subdomain_record.current_user_email, user_record.email;
        END IF;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'Fix complete! Created: %, Updated: %', created_count, updated_count;
END $$;

-- Verify the fixes
SELECT 
  'Verification: Users with subdomains' as check_type,
  us.subdomain,
  u.email as user_email,
  u.id as user_id,
  (SELECT COUNT(*) FROM blog_submissions WHERE subdomain = us.subdomain) as submissions_count,
  (SELECT COUNT(*) FROM blog_posts WHERE subdomain = us.subdomain) as posts_count
FROM user_subdomains us
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE us.subdomain IN ('plutonium', 'mrjetstream')
ORDER BY us.subdomain;
