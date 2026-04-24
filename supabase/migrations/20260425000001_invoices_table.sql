-- Invoices / CRM revenue table.
-- Stores manually-entered booking invoices so their revenue appears in the
-- admin dashboard alongside photo-order sales.

CREATE TABLE IF NOT EXISTS invoices (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
    client_name  TEXT,
    amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'cancelled', 'voided')),
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    paid_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status);
CREATE INDEX IF NOT EXISTS invoices_booking_id_idx ON invoices (booking_id);

-- Enable Row Level Security (admin-only access via service role key)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Allow all operations via the service role key used by API functions
CREATE POLICY IF NOT EXISTS "Service role full access"
  ON invoices FOR ALL
  USING (true)
  WITH CHECK (true);
