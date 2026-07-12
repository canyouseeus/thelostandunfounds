-- Universal photo printing: let a customer order a print of ANY public
-- gallery photo (not just the curated prodigi_products catalog), with an
-- optional black classic frame + white mat, orientation-aware.
--
-- print_catalog_options: the fixed size/frame menu shown at checkout
-- (3 sizes x framed/unframed = 6 rows). One row covers BOTH orientations
-- of a physical size — Prodigi encodes orientation in the SKU itself
-- (WxH vs HxW), so each row carries a landscape SKU and a portrait SKU.
--
-- print_frame_templates: admin-uploaded mockup photos (e.g. a black frame
-- hung on a wall) used to composite a customer's actual photo into a
-- realistic preview client-side. Keyed by orientation + mat so the preview
-- always matches the photo being framed.
--
-- prodigi_orders gains photo_id/print_option_id/orientation/mat_selected so
-- these orders flow through the exact same Stripe/Strike webhook
-- finalization + Prodigi submission + 42%-of-profit commission code already
-- built for the curated catalog (see 20260710190631_prodigi_print_shop.sql)
-- — sku and asset_url are resolved once at checkout time and stored on the
-- row, so the webhook needs no changes.

CREATE TABLE IF NOT EXISTS print_catalog_options (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    size_label           TEXT NOT NULL UNIQUE,
    width_in             NUMERIC(5,2) NOT NULL,
    height_in            NUMERIC(5,2) NOT NULL,
    framed               BOOLEAN NOT NULL DEFAULT false,
    frame_color          TEXT,
    mat_available        BOOLEAN NOT NULL DEFAULT false,
    sku_landscape        TEXT NOT NULL,
    sku_portrait         TEXT NOT NULL,
    base_cost            NUMERIC(10,2) NOT NULL DEFAULT 0,
    price                NUMERIC(10,2) NOT NULL,
    currency             TEXT NOT NULL DEFAULT 'USD',
    shipping_method      TEXT NOT NULL DEFAULT 'Standard',
    sort_order           INTEGER NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'draft')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS print_frame_templates (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    frame_color          TEXT NOT NULL DEFAULT 'black',
    orientation          TEXT NOT NULL CHECK (orientation IN ('landscape', 'portrait')),
    has_mat              BOOLEAN NOT NULL DEFAULT false,
    template_url         TEXT,
    bounds               JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (frame_color, orientation, has_mat)
);

ALTER TABLE prodigi_orders
    ADD COLUMN IF NOT EXISTS photo_id        UUID REFERENCES photos(id),
    ADD COLUMN IF NOT EXISTS print_option_id UUID REFERENCES print_catalog_options(id),
    ADD COLUMN IF NOT EXISTS orientation     TEXT CHECK (orientation IN ('landscape', 'portrait')),
    ADD COLUMN IF NOT EXISTS mat_selected    BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS prodigi_orders_photo_id_idx ON prodigi_orders (photo_id);

-- Reuse the same updated_at trigger function from the prior print-shop migration.
DROP TRIGGER IF EXISTS print_catalog_options_updated_at ON print_catalog_options;
CREATE TRIGGER print_catalog_options_updated_at
    BEFORE UPDATE ON print_catalog_options
    FOR EACH ROW EXECUTE FUNCTION prodigi_set_updated_at();

DROP TRIGGER IF EXISTS print_frame_templates_updated_at ON print_frame_templates;
CREATE TRIGGER print_frame_templates_updated_at
    BEFORE UPDATE ON print_frame_templates
    FOR EACH ROW EXECUTE FUNCTION prodigi_set_updated_at();

ALTER TABLE print_catalog_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_frame_templates ENABLE ROW LEVEL SECURITY;

-- Both tables are read by an unauthenticated public checkout flow (any
-- visitor picking print options for a gallery photo), unlike prodigi_products
-- which is only ever read server-side. Allow public SELECT of active/
-- published rows only; all writes stay service-role-only (admin API routes).
CREATE POLICY print_catalog_options_public_select ON print_catalog_options
    FOR SELECT USING (status = 'active');

CREATE POLICY print_frame_templates_public_select ON print_frame_templates
    FOR SELECT USING (template_url IS NOT NULL);

-- Seed the 6-option menu (3 sizes x framed/unframed), 3:2 ratio to match the
-- Fujifilm X-S20's native sensor so nothing crops. SKUs and base_cost are
-- best-effort placeholders (GLOBAL-FAP-* for Prodigi's Fine Art Print line,
-- GLOBAL-CFPM-* confirmed as their classic-frame line from API docs) —
-- ORCHESTRATOR: verify every SKU against GET /v4.0/products/{sku} and true
-- Prodigi cost via POST /v4.0/quotes before flipping PRODIGI_ENVIRONMENT to
-- live; correct base_cost/sku directly in the admin Print Shop UI if needed.
INSERT INTO print_catalog_options
    (size_label, width_in, height_in, framed, frame_color, mat_available, sku_landscape, sku_portrait, base_cost, price, sort_order, status)
VALUES
    ('12x8 Unframed',  12, 8, false, NULL,    false, 'GLOBAL-FAP-12X8',  'GLOBAL-FAP-8X12',  11, 45,  10, 'active'),
    ('18x12 Unframed', 18, 12, false, NULL,   false, 'GLOBAL-FAP-18X12', 'GLOBAL-FAP-12X18', 18, 70,  20, 'active'),
    ('24x16 Unframed', 24, 16, false, NULL,   false, 'GLOBAL-FAP-24X16', 'GLOBAL-FAP-16X24', 27, 105, 30, 'active'),
    ('12x8 Framed',    12, 8, true,  'black', true,  'GLOBAL-CFPM-12X8', 'GLOBAL-CFPM-8X12', 27, 110, 40, 'active'),
    ('18x12 Framed',   18, 12, true, 'black', true,  'GLOBAL-CFPM-18X12','GLOBAL-CFPM-12X18',42, 165, 50, 'active'),
    ('24x16 Framed',   24, 16, true, 'black', true,  'GLOBAL-CFPM-24X16','GLOBAL-CFPM-16X24',54, 210, 60, 'active')
ON CONFLICT (size_label) DO NOTHING;

-- Seed empty frame-template rows (landscape/portrait x mat/no-mat) so the
-- admin UI has something to attach an uploaded template image + bounds to.
-- template_url stays NULL — and therefore invisible to the public-select
-- policy above — until an admin uploads one.
INSERT INTO print_frame_templates (frame_color, orientation, has_mat, bounds)
VALUES
    ('black', 'landscape', false, '{"x": 14, "y": 18, "width": 72, "height": 64}'::jsonb),
    ('black', 'landscape', true,  '{"x": 20, "y": 22, "width": 60, "height": 56}'::jsonb),
    ('black', 'portrait',  false, '{"x": 22, "y": 10, "width": 56, "height": 80}'::jsonb),
    ('black', 'portrait',  true,  '{"x": 28, "y": 15, "width": 44, "height": 70}'::jsonb)
ON CONFLICT (frame_color, orientation, has_mat) DO NOTHING;
