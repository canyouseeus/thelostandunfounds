-- Deployment webhook tables: replaces the polling-based deployment-check
-- workflows (.agent/workflows/check-deployment.md, deploy-and-verify.md)
-- with a push model driven by Vercel's deployment webhooks.
--
-- `deployments` is an append-only ledger of every deployment event Vercel
-- sends us. `admin_notifications` is a generic admin-dashboard inbox — the
-- deployment webhook is its first writer, but the type column lets other
-- event sources reuse it later.

CREATE TABLE IF NOT EXISTS deployments (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vercel_deployment_id  TEXT NOT NULL UNIQUE,
    status                TEXT NOT NULL
                            CHECK (status IN ('succeeded', 'error', 'canceled')),
    commit_sha            TEXT,
    commit_message        TEXT,
    url                   TEXT,
    error_logs            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deployments_created_at_idx ON deployments (created_at DESC);

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read deployments" ON deployments;
CREATE POLICY "Authenticated can read deployments"
    ON deployments FOR SELECT
    TO authenticated
    USING (true);
-- No insert/update policy: only the webhook handler writes, using the
-- service role key, which bypasses RLS entirely.

CREATE TABLE IF NOT EXISTS admin_notifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info', 'warning', 'error')),
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON admin_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_type_idx ON admin_notifications (type);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read notifications" ON admin_notifications;
CREATE POLICY "Authenticated can read notifications"
    ON admin_notifications FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated can mark notifications read" ON admin_notifications;
CREATE POLICY "Authenticated can mark notifications read"
    ON admin_notifications FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
-- No insert policy: only the webhook handler (and any future server-side
-- writer) creates notifications, via the service role key.

-- Enable realtime so the admin notification bell gets pushed inserts
-- instead of having to poll.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
    END IF;
END $$;
