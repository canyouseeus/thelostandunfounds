-- Secret Santa pot tracking
-- Accumulates unclaimed 3% MLM bonuses for annual Christmas distribution
-- First distribution: December 26, 2026

CREATE TABLE IF NOT EXISTS secret_santa_pot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  distributed BOOLEAN DEFAULT FALSE,
  distribution_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS secret_santa_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pot_id UUID REFERENCES secret_santa_pot(id) ON DELETE CASCADE NOT NULL,
  commission_id UUID REFERENCES affiliate_commissions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT, -- 'no_referrer', 'no_level_2', etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_secret_santa_pot_year ON secret_santa_pot(year);
CREATE INDEX IF NOT EXISTS idx_secret_santa_contributions_pot ON secret_santa_contributions(pot_id);
CREATE INDEX IF NOT EXISTS idx_secret_santa_contributions_created ON secret_santa_contributions(created_at DESC);

-- Create 2026 pot (first Secret Santa distribution year)
INSERT INTO secret_santa_pot (year, total_amount, distributed)
VALUES (2026, 0, FALSE)
ON CONFLICT (year) DO NOTHING;

-- Create current year pot if different from 2026
INSERT INTO secret_santa_pot (year, total_amount, distributed)
VALUES (EXTRACT(YEAR FROM NOW())::INTEGER, 0, FALSE)
ON CONFLICT (year) DO NOTHING;

-- RLS Policies
ALTER TABLE secret_santa_pot ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_santa_contributions ENABLE ROW LEVEL SECURITY;

-- Everyone can view the pot (read-only)
CREATE POLICY IF NOT EXISTS "Anyone can view Secret Santa pot"
  ON secret_santa_pot
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view contributions"
  ON secret_santa_contributions
  FOR SELECT
  USING (true);

-- Service role has full access
CREATE POLICY IF NOT EXISTS "Service role has full access to pot"
  ON secret_santa_pot
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role has full access to contributions"
  ON secret_santa_contributions
  FOR ALL
  USING (true)
  WITH CHECK (true);

