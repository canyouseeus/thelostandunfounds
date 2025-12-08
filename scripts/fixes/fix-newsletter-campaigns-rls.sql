-- Fix Newsletter Campaigns RLS Policy
-- This replaces the email-based policy with a user_roles-based policy
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admins to insert newsletter campaigns" ON public.newsletter_campaigns;
DROP POLICY IF EXISTS "Allow admins to read newsletter campaigns" ON public.newsletter_campaigns;
DROP POLICY IF EXISTS "Allow admins to update newsletter campaigns" ON public.newsletter_campaigns;

-- Drop new policy if it exists (in case of re-run)
DROP POLICY IF EXISTS "Admins can do everything on newsletter_campaigns" ON public.newsletter_campaigns;

-- Create new policy using user_roles table
CREATE POLICY "Admins can do everything on newsletter_campaigns"
ON public.newsletter_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Keep service role policy
DROP POLICY IF EXISTS "Allow service role full access to newsletter campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Allow service role full access to newsletter campaigns"
ON public.newsletter_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'newsletter_campaigns'
ORDER BY policyname;

