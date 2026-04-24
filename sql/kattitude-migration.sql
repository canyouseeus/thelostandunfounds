-- Kattitude Tattoo Studio — Multi-tenant client dashboard migration
-- Run this in Supabase SQL editor

-- ─── BUSINESSES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  type         text NOT NULL DEFAULT 'tattoo',
  logo_url     text,
  settings     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

-- ─── BUSINESS USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_users (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id  uuid REFERENCES businesses(id) ON DELETE CASCADE,
  user_email   text NOT NULL,
  role         text NOT NULL DEFAULT 'staff',  -- owner / artist / staff
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, user_email)
);

-- ─── ARTISTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       uuid REFERENCES businesses(id) ON DELETE CASCADE,
  user_email        text,
  name              text NOT NULL,
  bio               text,
  profile_image_url text,
  specialties       text[] DEFAULT '{}',
  instagram_handle  text,
  created_at        timestamptz DEFAULT now()
);

-- ─── ARTIST CLIENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artist_clients (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id    uuid REFERENCES artists(id) ON DELETE CASCADE,
  client_name  text NOT NULL,
  client_email text,
  client_phone text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ─── ARTIST SESSIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artist_sessions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id      uuid REFERENCES artists(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES artist_clients(id) ON DELETE SET NULL,
  date           date NOT NULL,
  duration_hours numeric(4,2),
  amount         numeric(10,2) DEFAULT 0,
  tip            numeric(10,2) DEFAULT 0,
  type           text NOT NULL DEFAULT 'session',    -- consultation / session / touchup
  status         text NOT NULL DEFAULT 'scheduled',  -- scheduled / completed / cancelled / no-show
  notes          text,
  created_at     timestamptz DEFAULT now()
);

-- ─── WAIVERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waivers (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       uuid REFERENCES businesses(id) ON DELETE CASCADE,
  artist_id         uuid REFERENCES artists(id) ON DELETE SET NULL,
  client_name       text NOT NULL,
  client_email      text NOT NULL,
  client_phone      text,
  date_of_birth     date,
  emergency_contact text,
  medical_conditions text,
  signature_data    text,  -- base64 PNG of drawn signature
  agreed_to_terms   boolean NOT NULL DEFAULT false,
  newsletter_opt_in boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- ─── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_business_users_email    ON business_users(user_email);
CREATE INDEX IF NOT EXISTS idx_artists_business        ON artists(business_id);
CREATE INDEX IF NOT EXISTS idx_artist_clients_artist   ON artist_clients(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_sessions_artist  ON artist_sessions(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_sessions_date    ON artist_sessions(date);
CREATE INDEX IF NOT EXISTS idx_waivers_business        ON waivers(business_id);
CREATE INDEX IF NOT EXISTS idx_waivers_email           ON waivers(client_email);

-- ─── ROW-LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE businesses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waivers         ENABLE ROW LEVEL SECURITY;

-- Businesses: public read, platform-admin write
CREATE POLICY "businesses_public_read" ON businesses
  FOR SELECT USING (true);

CREATE POLICY "businesses_admin_write" ON businesses
  FOR ALL USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

-- Business users: admin manage, own-email read
CREATE POLICY "business_users_admin" ON business_users
  FOR ALL USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

CREATE POLICY "business_users_own_read" ON business_users
  FOR SELECT USING (user_email = auth.email());

-- Artists: public read (portfolio), admin + owner write
CREATE POLICY "artists_public_read" ON artists
  FOR SELECT USING (true);

CREATE POLICY "artists_admin_write" ON artists
  FOR ALL USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

CREATE POLICY "artists_owner_write" ON artists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = artists.business_id
        AND business_users.user_email   = auth.email()
        AND business_users.role        IN ('owner')
    )
  );

-- Artist clients: admin + owning artist
CREATE POLICY "artist_clients_admin" ON artist_clients
  FOR ALL USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

CREATE POLICY "artist_clients_self" ON artist_clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id         = artist_clients.artist_id
        AND artists.user_email = auth.email()
    )
  );

-- Sessions: admin + owning artist
CREATE POLICY "artist_sessions_admin" ON artist_sessions
  FOR ALL USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

CREATE POLICY "artist_sessions_self" ON artist_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id         = artist_sessions.artist_id
        AND artists.user_email = auth.email()
    )
  );

-- Waivers: public insert (no auth required), admin + owner read
CREATE POLICY "waivers_public_insert" ON waivers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "waivers_admin_read" ON waivers
  FOR SELECT USING (
    auth.email() IN ('thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com')
  );

CREATE POLICY "waivers_owner_read" ON waivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_users
      WHERE business_users.business_id = waivers.business_id
        AND business_users.user_email   = auth.email()
        AND business_users.role        IN ('owner')
    )
  );

CREATE POLICY "waivers_artist_read" ON waivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id         = waivers.artist_id
        AND artists.user_email = auth.email()
    )
  );

-- ─── SEED DATA ─────────────────────────────────────────────────────────────
INSERT INTO businesses (name, slug, type, settings) VALUES (
  'Kattitude Tattoo Studio',
  'kattitude',
  'tattoo',
  '{
    "location": "Austin, TX",
    "phone": "",
    "email": "",
    "instagram": "",
    "hours": {
      "monday":    "Closed",
      "tuesday":   "10am – 6pm",
      "wednesday": "10am – 6pm",
      "thursday":  "10am – 6pm",
      "friday":    "10am – 7pm",
      "saturday":  "10am – 6pm",
      "sunday":    "Closed"
    }
  }'
) ON CONFLICT (slug) DO NOTHING;

-- Grant admin access to Kattitude
INSERT INTO business_users (business_id, user_email, role)
SELECT id, 'thelostandunfounds@gmail.com', 'owner'
FROM businesses WHERE slug = 'kattitude'
ON CONFLICT DO NOTHING;
