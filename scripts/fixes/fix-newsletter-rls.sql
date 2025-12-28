-- Enable RLS
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for Admins to ALL operations
CREATE POLICY "Admins can do everything on newsletter_campaigns"
ON public.newsletter_campaigns
FOR ALL
TO authenticated
USING (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  )
);
