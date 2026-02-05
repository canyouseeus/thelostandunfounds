-- Fix Infinite Recursion in Admin RLS
-- The previous policy caused recursion because checking "is_admin" required reading the table, which triggered the policy check again.
-- We fix this by moving the check into a SECURITY DEFINER function which bypasses RLS for the internal query.

-- 1. Create a secure function to check admin status
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Bypasses RLS for the queries inside this function
SET search_path = public -- Security best practice
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE public.user_roles.user_id = check_is_admin.user_id
    AND public.user_roles.is_admin = true
  );
END;
$$;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can do everything" ON public.user_roles;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Admins can do everything"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Use the function instead of direct SELECT
  public.check_is_admin(auth.uid())
  OR
  -- Keep the bootstrap fallback
  auth.email() IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
);

-- Ensure the read-own policy is still there (it wasn't recursive, but good to ensure)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
