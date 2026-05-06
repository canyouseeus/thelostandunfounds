-- Enable Row Level Security on six public tables flagged by the database linter,
-- then add policies that preserve current access patterns:
--   * tags / photo_tags  -> public read, admin write
--   * clients / invoices / invoice_payments -> admin only
--   * sync_progress -> service_role only (cron handlers)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ── tags ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_public_read ON public.tags;
CREATE POLICY tags_public_read
  ON public.tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS tags_admin_write ON public.tags;
CREATE POLICY tags_admin_write
  ON public.tags
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tags_service_role_all ON public.tags;
CREATE POLICY tags_service_role_all
  ON public.tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── photo_tags ───────────────────────────────────────────────────────────────
ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS photo_tags_public_read ON public.photo_tags;
CREATE POLICY photo_tags_public_read
  ON public.photo_tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS photo_tags_admin_write ON public.photo_tags;
CREATE POLICY photo_tags_admin_write
  ON public.photo_tags
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS photo_tags_service_role_all ON public.photo_tags;
CREATE POLICY photo_tags_service_role_all
  ON public.photo_tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── clients ──────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_admin_all ON public.clients;
CREATE POLICY clients_admin_all
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS clients_service_role_all ON public.clients;
CREATE POLICY clients_service_role_all
  ON public.clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── invoices ─────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_admin_all ON public.invoices;
CREATE POLICY invoices_admin_all
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS invoices_service_role_all ON public.invoices;
CREATE POLICY invoices_service_role_all
  ON public.invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── invoice_payments ─────────────────────────────────────────────────────────
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_payments_admin_all ON public.invoice_payments;
CREATE POLICY invoice_payments_admin_all
  ON public.invoice_payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS invoice_payments_service_role_all ON public.invoice_payments;
CREATE POLICY invoice_payments_service_role_all
  ON public.invoice_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── sync_progress ────────────────────────────────────────────────────────────
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_progress_service_role_all ON public.sync_progress;
CREATE POLICY sync_progress_service_role_all
  ON public.sync_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
