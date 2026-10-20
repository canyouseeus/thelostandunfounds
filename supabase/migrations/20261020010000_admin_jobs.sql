-- =====================================================
-- admin_jobs — how an agent asks the site to do admin work
-- =====================================================
-- Admin routes used to accept a header naming the owner, which anyone could
-- send. Once they require a verified session or ADMIN_SECRET (#290), an agent
-- session holds neither. Instead it writes a row here through the Supabase
-- connector — which is authenticated as the owner — and the admin-jobs cron
-- (Vercel's own CRON_SECRET) runs it with the credentials already in Vercel.
--
-- RLS is on with no policies: only the service role and the connector's
-- postgres role can read or write. The public anon key cannot queue a job.
--
-- Lifecycle: queued -> running -> done | failed | waiting_funds (re-queued
-- at not_before). A job is never retried automatically after it started:
-- a timed-out send may already have gone out.
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'failed', 'waiting_funds', 'cancelled')),
  requested_by TEXT,
  note TEXT,
  idempotency_key TEXT,
  not_before TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_jobs_idempotency
  ON admin_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_jobs_due
  ON admin_jobs(not_before) WHERE status IN ('queued', 'waiting_funds');

ALTER TABLE admin_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_jobs FROM anon, authenticated;

-- Claim due jobs for one runner. SKIP LOCKED so two overlapping cron runs
-- never take the same job.
CREATE OR REPLACE FUNCTION claim_admin_jobs(p_limit INTEGER DEFAULT 5)
RETURNS SETOF admin_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE admin_jobs j
  SET status = 'running', started_at = NOW(), attempts = j.attempts + 1
  WHERE j.id IN (
    SELECT id FROM admin_jobs
    WHERE status IN ('queued', 'waiting_funds') AND not_before <= NOW()
    ORDER BY created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING j.*;
END;
$$;

REVOKE ALL ON FUNCTION claim_admin_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_admin_jobs(INTEGER) TO service_role;

COMMENT ON TABLE admin_jobs IS
  'Admin actions queued by agents via the Supabase connector; run by /api/cron/admin-jobs. See lib/api-handlers/admin/_jobs.ts for the allowed actions.';
