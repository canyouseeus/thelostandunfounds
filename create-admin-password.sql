-- Step 1: Check if admin@thelostandunfounds.com user exists
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Email Confirmed'
    ELSE 'Email NOT Confirmed'
  END as status
FROM auth.users
WHERE email = 'admin@thelostandunfounds.com';

-- Step 2: If user exists, set them as admin
-- (Run this after creating the user in Supabase Auth)
INSERT INTO user_roles (user_id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = 'admin@thelostandunfounds.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- Step 3: Verify admin status
SELECT 
  ur.user_id,
  ur.email,
  ur.is_admin,
  u.email as auth_email,
  u.email_confirmed_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.email = 'admin@thelostandunfounds.com' OR u.email = 'admin@thelostandunfounds.com';


