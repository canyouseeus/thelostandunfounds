-- Add contact info fields collected during affiliate signup wizard
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
