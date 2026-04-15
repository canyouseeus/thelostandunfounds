-- Booking System Migration
-- Run this in the Supabase SQL Editor

-- ============================================================
-- bookings table: stores booking requests from clients
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  event_type    TEXT NOT NULL,   -- e.g. "Concert", "Portrait", "Retainer"
  event_date    DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  location      TEXT,
  notes         TEXT,
  retainer      BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- booking_availability table: lets photographer block dates
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE NOT NULL UNIQUE,
  is_blocked  BOOLEAN NOT NULL DEFAULT true,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_event_date  ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_email        ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_availability_date     ON booking_availability(date);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_availability ENABLE ROW LEVEL SECURITY;

-- Public: anyone can insert a booking request
DROP POLICY IF EXISTS "Anyone can submit a booking" ON bookings;
CREATE POLICY "Anyone can submit a booking"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- Public: cannot read bookings (admin only via service role)
DROP POLICY IF EXISTS "Public cannot read bookings" ON bookings;
CREATE POLICY "Public cannot read bookings"
  ON bookings FOR SELECT
  USING (false);

-- Public: read availability so the calendar can show blocked dates
DROP POLICY IF EXISTS "Anyone can read availability" ON booking_availability;
CREATE POLICY "Anyone can read availability"
  ON booking_availability FOR SELECT
  USING (true);

-- Public: cannot modify availability
DROP POLICY IF EXISTS "Public cannot modify availability" ON booking_availability;
CREATE POLICY "Public cannot modify availability"
  ON booking_availability FOR INSERT
  WITH CHECK (false);
