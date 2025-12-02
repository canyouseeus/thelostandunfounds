-- Update all test affiliate commission rates to 42%
-- This makes test data consistent with the default rate

UPDATE affiliates 
SET commission_rate = 42.00 
WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)';

-- Verify the update
SELECT 
  code,
  commission_rate,
  status
FROM affiliates
WHERE code ~ '^(KING|PRO|MID|NEW|INACTIVE|SUSPEND)'
ORDER BY total_earnings DESC
LIMIT 10;



