-- Add Emails to user_roles from blog_submissions
-- This script populates user_roles.email for users who have subdomains but no email in user_roles
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  updated_count INTEGER := 0;
  created_count INTEGER := 0;
  subdomain_record RECORD;
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Starting email population from blog_submissions...';

  -- For each user with a subdomain, try to find their email from blog_submissions
  FOR subdomain_record IN
    SELECT DISTINCT ON (us.user_id)
      us.user_id,
      us.subdomain,
      bs.author_email,
      bs.author_name
    FROM user_subdomains us
    INNER JOIN blog_submissions bs ON LOWER(TRIM(bs.subdomain)) = LOWER(TRIM(us.subdomain))
    WHERE bs.author_email IS NOT NULL
      AND bs.subdomain IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = us.user_id 
        AND ur.email IS NOT NULL
      )
    ORDER BY us.user_id, bs.created_at DESC
  LOOP
    -- Check if user_roles entry exists
    SELECT user_id, email INTO user_record
    FROM user_roles
    WHERE user_id = subdomain_record.user_id
    LIMIT 1;

    IF user_record.user_id IS NOT NULL THEN
      -- Update existing entry
      UPDATE user_roles
      SET email = subdomain_record.author_email,
          updated_at = NOW()
      WHERE user_id = subdomain_record.user_id
        AND (email IS NULL OR email = '');
      
      IF FOUND THEN
        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated email for user_id % (subdomain: %) to %', 
          subdomain_record.user_id, subdomain_record.subdomain, subdomain_record.author_email;
      END IF;
    ELSE
      -- Create new entry
      INSERT INTO user_roles (user_id, email, is_admin, created_at, updated_at)
      VALUES (
        subdomain_record.user_id,
        subdomain_record.author_email,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET email = subdomain_record.author_email,
          updated_at = NOW()
      WHERE user_roles.email IS NULL OR user_roles.email = '';
      
      IF FOUND THEN
        created_count := created_count + 1;
        RAISE NOTICE 'Created user_roles entry for user_id % (subdomain: %) with email %', 
          subdomain_record.user_id, subdomain_record.subdomain, subdomain_record.author_email;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Email population complete! Created: %, Updated: %', created_count, updated_count;
END $$;

-- Verify the results
SELECT 
  'Verification: user_roles with emails' as check_type,
  ur.user_id,
  ur.email,
  ur.is_admin,
  us.subdomain,
  u.email as auth_users_email
FROM user_roles ur
LEFT JOIN user_subdomains us ON us.user_id = ur.user_id
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE us.subdomain IN ('plutonium', 'mrjetstream')
ORDER BY us.subdomain;
