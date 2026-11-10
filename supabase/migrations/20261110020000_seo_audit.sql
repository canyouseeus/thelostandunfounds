-- =====================================================
-- SEO audit — our own site crawl (Admin → SEO)
-- =====================================================
-- /api/cron/seo-audit crawls www.thelostandunfounds.com daily and writes here
-- (lib/seo-audit/store.ts). The admin SEO tab reads it through
-- /api/admin/seo-audit, which checks the admin session first.
--
-- RLS is on with no policies: only the service role (the API) and the
-- connector's postgres role can read or write. The public anon key cannot.
--
-- Pages and issues are kept for the newest 30 finished runs; older runs keep
-- their summary row so the history chart goes back further.
--
-- Idempotent and DROP-free (see CLAUDE.md → DATABASE PROJECT RULE).
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
  trigger TEXT NOT NULL DEFAULT 'cron',
  start_url TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  notices INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER,
  stats JSONB,
  counts_by_code JSONB,
  error TEXT,
  -- Resumable crawl state while running; cleared when the run finishes.
  state JSONB,
  lease_until TIMESTAMPTZ,
  invocations INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_runs_started ON seo_audit_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_audit_runs_status ON seo_audit_runs(status, started_at DESC);

CREATE TABLE IF NOT EXISTS seo_audit_pages (
  run_id UUID NOT NULL REFERENCES seo_audit_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, url)
);

CREATE TABLE IF NOT EXISTS seo_audit_issues (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES seo_audit_runs(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'notice')),
  url TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_issues_run_code ON seo_audit_issues(run_id, code);
CREATE INDEX IF NOT EXISTS idx_seo_audit_issues_run_url ON seo_audit_issues(run_id, url);

ALTER TABLE seo_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audit_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON seo_audit_runs FROM anon, authenticated;
REVOKE ALL ON seo_audit_pages FROM anon, authenticated;
REVOKE ALL ON seo_audit_issues FROM anon, authenticated;
REVOKE ALL ON SEQUENCE seo_audit_issues_id_seq FROM anon, authenticated;

COMMENT ON TABLE seo_audit_runs IS
  'Daily crawl of www.thelostandunfounds.com by /api/cron/seo-audit; read by Admin → SEO. See lib/seo-audit/.';
COMMENT ON TABLE seo_audit_pages IS 'One row per URL crawled in a seo_audit_runs run (PageRecord JSON in data).';
COMMENT ON TABLE seo_audit_issues IS 'Issues found in a seo_audit_runs run; codes are the keys of ISSUES in lib/seo-audit/analyze.ts.';
