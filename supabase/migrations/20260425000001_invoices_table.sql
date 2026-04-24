-- CRM invoices and clients tables.
-- Creates both tables IF NOT EXISTS so the migration is safe to apply when
-- the tables were already created directly in Supabase.

CREATE TABLE IF NOT EXISTS clients (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT,
    phone      TEXT,
    business   TEXT,
    notes      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number TEXT,
    date           DATE NOT NULL DEFAULT CURRENT_DATE,
    event_date     DATE,
    description    TEXT,
    line_items     JSONB NOT NULL DEFAULT '[]',
    subtotal       NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    payment_method TEXT,
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount     NUMERIC(10, 2) NOT NULL,
    method     TEXT,
    paid_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes      TEXT
);

CREATE INDEX IF NOT EXISTS invoices_status_idx     ON invoices (status);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx  ON invoices (client_id);
CREATE INDEX IF NOT EXISTS invoice_payments_inv_idx ON invoice_payments (invoice_id);
