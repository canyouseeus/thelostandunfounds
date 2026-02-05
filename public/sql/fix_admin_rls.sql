-- Fix Admin RLS Policies

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can do everything" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Create robust policies
-- 1. Allow any authenticated user to read their OWN role (essential for isAdmin check)
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow admins (defined by email or existing true capability) to do everything
CREATE POLICY "Admins can do everything"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Check if user is already an admin in the table
  (SELECT is_admin FROM public.user_roles WHERE user_id = auth.uid()) = true
  OR
  -- Fallback for hardcoded admin email bootstrapping
  auth.email() IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
);

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT ON public.user_roles TO authenticated;
