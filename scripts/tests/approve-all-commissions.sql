-- ============================================
-- APPROVE ALL PENDING COMMISSIONS
-- ============================================
-- Run this to approve all pending commissions so affiliates can request payouts

-- Step 1: View pending commissions
SELECT 
  ac.id,
  ac.order_id,
  ac.amount,
  ac.status,
  a.code as affiliate_code,
  a.total_earnings as current_earnings
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE ac.status = 'pending'
ORDER BY ac.created_at DESC;

-- Step 2: Approve all pending commissions
UPDATE affiliate_commissions 
SET status = 'approved'
WHERE status = 'pending';

-- Step 3: Update affiliate totals
UPDATE affiliates
SET 
  total_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM affiliate_commissions
    WHERE affiliate_id = affiliates.id
      AND status IN ('approved', 'paid')
  ),
  total_conversions = (
    SELECT COUNT(*)
    FROM affiliate_commissions
    WHERE affiliate_id = affiliates.id
      AND status IN ('approved', 'paid')
  )
WHERE id IN (
  SELECT DISTINCT affiliate_id
  FROM affiliate_commissions
  WHERE status = 'approved'
);

-- Step 4: Verify
SELECT 
  ac.order_id,
  ac.amount,
  ac.status,
  a.code as affiliate_code,
  a.total_earnings,
  a.total_conversions
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE a.code IN ('TESTKING1', 'TESTKING3', 'TESTMID2')
ORDER BY ac.created_at DESC;



