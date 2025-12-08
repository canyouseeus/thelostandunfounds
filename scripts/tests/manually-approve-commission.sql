-- ============================================
-- MANUALLY APPROVE PENDING COMMISSION
-- ============================================
-- Use this to manually approve a commission if capture endpoint wasn't called
-- Replace the order_id with your actual PayPal order ID

-- Step 1: Find the pending commission
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
ORDER BY ac.created_at DESC
LIMIT 5;

-- Step 2: Approve the commission (replace ORDER_ID with actual order ID)
-- UPDATE affiliate_commissions 
-- SET status = 'approved'
-- WHERE order_id = 'a5f2d9c8-62c9-4f53-a239-347ad7daffb0' -- Replace with your order ID
--   AND status = 'pending';

-- Step 3: Update affiliate totals (replace ORDER_ID and AFFILIATE_ID)
-- First, get the commission amount and affiliate ID:
-- SELECT 
--   ac.amount,
--   ac.affiliate_id,
--   a.total_earnings,
--   a.total_conversions
-- FROM affiliate_commissions ac
-- JOIN affiliates a ON ac.affiliate_id = a.id
-- WHERE ac.order_id = 'a5f2d9c8-62c9-4f53-a239-347ad7daffb0';

-- Then update:
-- UPDATE affiliates
-- SET 
--   total_earnings = total_earnings + (SELECT amount FROM affiliate_commissions WHERE order_id = 'a5f2d9c8-62c9-4f53-a239-347ad7daffb0'),
--   total_conversions = total_conversions + 1
-- WHERE id = (SELECT affiliate_id FROM affiliate_commissions WHERE order_id = 'a5f2d9c8-62c9-4f53-a239-347ad7daffb0');

-- Step 4: Verify the update
-- SELECT 
--   ac.order_id,
--   ac.status,
--   ac.amount,
--   a.code,
--   a.total_earnings,
--   a.total_conversions
-- FROM affiliate_commissions ac
-- JOIN affiliates a ON ac.affiliate_id = a.id
-- WHERE ac.order_id = 'a5f2d9c8-62c9-4f53-a239-347ad7daffb0';

