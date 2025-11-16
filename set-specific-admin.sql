-- Set admin@thelostandunfounds.com as admin

INSERT INTO user_roles (user_id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = 'admin@thelostandunfounds.com'
ON CONFLICT (user_id) 
DO UPDATE SET is_admin = true, email = EXCLUDED.email;

-- Verify it worked
SELECT 
  ur.user_id,
  ur.email,
  ur.is_admin,
  u.email as auth_email,
  u.created_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.email = 'admin@thelostandunfounds.com' OR u.email = 'admin@thelostandunfounds.com';


