-- Track every photo download event (free + watermarked via /api/gallery/stream).
-- The existing photo_entitlements.download_count only aggregates paid downloads;
-- this table captures full per-event telemetry including identity (email) and
-- source IP for admin analytics.

CREATE TABLE IF NOT EXISTS photo_download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    google_drive_file_id TEXT,
    email TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    source TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the admin queries: recent-events list, per-photo aggregates,
-- per-email filtering, and time-window summaries.
CREATE INDEX IF NOT EXISTS photo_download_events_created_at_idx
    ON photo_download_events (created_at DESC);
CREATE INDEX IF NOT EXISTS photo_download_events_photo_id_idx
    ON photo_download_events (photo_id);
CREATE INDEX IF NOT EXISTS photo_download_events_email_idx
    ON photo_download_events (email);

-- RLS: only service role reads/writes these events. The admin dashboard uses
-- the service role via authenticated admin sessions.
ALTER TABLE photo_download_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_downloads"
    ON photo_download_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
