-- MINIMAL TEST: Create just ONE table to verify SQL execution works
-- Run this FIRST to test if table creation works

-- Drop if exists (for testing)
DROP TABLE IF EXISTS test_table_creation;

-- Create test table
CREATE TABLE test_table_creation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verify it was created
SELECT 
  'Table Created Successfully!' as status,
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'test_table_creation'
AND table_schema = 'public';

-- Insert test data
INSERT INTO test_table_creation (name) VALUES ('Test Row');

-- Verify data was inserted
SELECT * FROM test_table_creation;




