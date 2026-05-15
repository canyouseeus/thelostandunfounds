-- ── Link invoices ↔ bookings ─────────────────────────────────────────────────
-- Adds a nullable booking_id FK on invoices so an invoice can be generated
-- directly from a booking and back-referenced from the booking row in admin.

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_booking_id_idx ON invoices (booking_id);

-- Convenience: if a booking already has a 'sent' invoice we want to surface
-- that on the booking row. Just an index here, the join lives in the API.
