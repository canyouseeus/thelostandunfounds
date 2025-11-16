-- Set yourself as admin
-- Replace YOUR_USER_ID with your actual user ID from auth.users

-- First, find your user ID
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Then run this (replace YOUR_USER_ID with the ID from above):
-- INSERT INTO user_roles (user_id, email, is_admin)
-- VALUES ('YOUR_USER_ID', 'your-email@example.com', true)
-- ON CONFLICT (user_id) 
-- DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- OR if you know your email, use this:
-- INSERT INTO user_roles (user_id, email, is_admin)
-- SELECT id, email, true
-- FROM auth.users
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (user_id) 
-- DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- Quick version: Set the most recent user as admin
INSERT INTO user_roles (user_id, email, is_admin)
SELECT id, email, true
FROM auth.users
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (user_id) 
DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- Verify
SELECT 
  ur.user_id,
  ur.email,
  ur.is_admin,
  u.email as auth_email
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.is_admin = true;


