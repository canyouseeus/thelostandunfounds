-- Enable RLS
ALTER TABLE public.affiliate_click_events ENABLE ROW LEVEL SECURITY;

-- 1. Public Insert (for tracking clicks)
CREATE POLICY "Allow public insert"
ON public.affiliate_click_events
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- 2. Affiliates can view their own clicks
CREATE POLICY "Affiliates can view own clicks"
ON public.affiliate_click_events
FOR SELECT
TO authenticated
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates
    WHERE user_id = auth.uid()
  )
);

-- 3. Admins can view all
CREATE POLICY "Admins can view all"
ON public.affiliate_click_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);
