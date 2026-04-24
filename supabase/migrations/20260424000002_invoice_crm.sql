-- Invoice/CRM system: clients, invoices, invoice_payments
-- Idempotent migration — safe to re-run.

-- ── clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    business    TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'service_role_all'
    ) THEN
        CREATE POLICY service_role_all ON clients
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ── invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number  TEXT NOT NULL UNIQUE,
    date            DATE NOT NULL,
    event_date      DATE,
    description     TEXT,
    line_items      JSONB NOT NULL DEFAULT '[]',
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','paid','overdue')),
    payment_method  TEXT,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'service_role_all'
    ) THEN
        CREATE POLICY service_role_all ON invoices
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ── invoice_payments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_payments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount      NUMERIC(10,2) NOT NULL,
    method      TEXT,
    paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invoice_payments' AND policyname = 'service_role_all'
    ) THEN
        CREATE POLICY service_role_all ON invoice_payments
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ── seed: Toke Truck (first real client + paid invoice) ──────────────────────
DO $$
DECLARE
    v_client_id  UUID;
    v_invoice_id UUID;
BEGIN
    -- Insert client only if it doesn't already exist
    SELECT id INTO v_client_id FROM clients WHERE name = 'Toke Truck' LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (name, business, notes)
        VALUES (
            'Toke Truck',
            'Toke Truck',
            'Repeat client. Payment via Venmo (@thelostandunfounds), Cash App ($ILLKID24), Apple Pay (737-296-1598), or Bitcoin.'
        )
        RETURNING id INTO v_client_id;
    END IF;

    -- Insert invoice only if INV-001 doesn't exist
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-001') THEN
        INSERT INTO invoices (
            client_id,
            invoice_number,
            date,
            event_date,
            description,
            line_items,
            subtotal,
            total,
            status,
            payment_method,
            paid_at
        ) VALUES (
            v_client_id,
            'INV-001',
            '2026-04-16',
            '2026-04-18',
            'Event Photography — Toke Truck (2 locations)',
            '[
                {
                    "description": "East 6th St (10PM–11:15PM) — 10 photos + 1 reel",
                    "quantity": 1,
                    "unit_price": 150.00,
                    "amount": 150.00
                },
                {
                    "description": "West 6th St (11:45PM–1AM) — 10 photos + 1 reel",
                    "quantity": 1,
                    "unit_price": 150.00,
                    "amount": 150.00
                }
            ]',
            300.00,
            300.00,
            'paid',
            'Venmo, Cash App, Apple Pay, Bitcoin',
            '2026-04-18 00:00:00+00'
        )
        RETURNING id INTO v_invoice_id;

        -- Record the two payments
        INSERT INTO invoice_payments (invoice_id, amount, method, paid_at, notes)
        VALUES
            (v_invoice_id, 150.00, 'Venmo', '2026-04-16 00:00:00+00', '$150 deposit — @thelostandunfounds'),
            (v_invoice_id, 150.00, 'Venmo', '2026-04-18 00:00:00+00', '$150 balance — collected night of event');
    END IF;
END $$;
