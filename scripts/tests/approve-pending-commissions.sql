-- ============================================
-- APPROVE ALL PENDING COMMISSIONS
-- ============================================
-- This script approves all pending commissions and updates affiliate totals
-- Run this in Supabase SQL Editor

-- Step 1: View pending commissions before approval
SELECT 
  ac.id,
  ac.order_id,
  ac.amount,
  ac.status,
  ac.affiliate_id,
  a.code as affiliate_code,
  a.total_earnings as current_earnings,
  a.total_conversions as current_conversions
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE ac.status = 'pending'
ORDER BY ac.created_at DESC;

-- Step 2: Approve all pending commissions
UPDATE affiliate_commissions 
SET status = 'approved'
WHERE status = 'pending';

-- Step 3: Update affiliate totals for each affiliate with pending commissions
-- This calculates the new totals based on all approved commissions
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

-- Step 4: Verify the updates
SELECT 
  ac.order_id,
  ac.amount,
  ac.status,
  a.code as affiliate_code,
  a.total_earnings,
  a.total_conversions
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE ac.status IN ('approved', 'pending')
ORDER BY ac.created_at DESC
LIMIT 10;

-- Step 5: Check payout eligibility
SELECT 
  code,
  total_earnings,
  payment_threshold,
  paypal_email,
  CASE 
    WHEN paypal_email IS NULL OR paypal_email = '' THEN '❌ No PayPal email set'
    WHEN total_earnings < payment_threshold THEN CONCAT('❌ Need $', (payment_threshold - total_earnings)::text, ' more')
    ELSE '✅ Eligible for Payout'
  END as payout_status
FROM affiliates
WHERE code IN ('TESTKING3', 'TESTMID2', 'TESTKING1')
ORDER BY total_earnings DESC;

