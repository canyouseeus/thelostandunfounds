-- Free-form notes attached to calendar dates. Distinct from
-- booking_availability (which is strictly for admin-blocked dates and has a
-- UNIQUE(date) constraint). Notes support multiple entries per date and are
-- surfaced on the master calendar's TIME IN REVIEW card.

CREATE TABLE IF NOT EXISTS calendar_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date       DATE NOT NULL,
    note       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_notes_date ON calendar_notes(date);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_created_at ON calendar_notes(created_at DESC);

ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;

-- Only service role reads/writes. Notes are admin-facing, never public.
DROP POLICY IF EXISTS "service_role_all_calendar_notes" ON calendar_notes;
CREATE POLICY "service_role_all_calendar_notes"
    ON calendar_notes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
