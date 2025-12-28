# Affiliate Program Testing Guide

This guide walks you through testing all aspects of the affiliate program to ensure payouts and tracking are properly configured.

## Prerequisites

1. **Run the test data script first:**
   ```sql
   -- Run: scripts/tests/affiliate-program-test.sql
   ```

2. **Have test products in your database** (already done)

3. **Have at least one user account** for testing

## Test Checklist

### ✅ Test 1: Affiliate Click Tracking

**Purpose:** Verify that affiliate link clicks are tracked correctly.

**Steps:**
1. Visit shop page with affiliate code: `http://localhost:3000/shop?ref=TEST-AFFILIATE-1`
2. Check browser console for: `✅ Affiliate click tracked`
3. Verify in database:
   ```sql
   SELECT code, total_clicks FROM affiliates WHERE code = 'TEST-AFFILIATE-1';
   ```
   - `total_clicks` should increment

**Expected Result:** Click count increases in database

---

### ✅ Test 2: Commission Calculation (New Customer)

**Purpose:** Test commission calculation when a new customer purchases via affiliate link.

**Steps:**
1. Clear cookies or use incognito mode
2. Visit shop with affiliate link: `http://localhost:3000/shop?ref=TEST-AFFILIATE-1`
3. Add a product to cart (e.g., Premium Subscription - $29.99)
4. Complete checkout via PayPal
5. After payment, commission should be calculated automatically

**Verify Commission:**
```sql
-- Check commission was created
SELECT 
  ac.id,
  ac.order_id,
  ac.amount,
  ac.status,
  ac.profit_generated,
  a.code as affiliate_code
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE a.code = 'TEST-AFFILIATE-1'
ORDER BY ac.created_at DESC
LIMIT 1;
```

**Expected Commission:**
- Product price: $29.99
- Product cost: $5.00 (from test data)
- Profit: $24.99
- Commission (42%): $10.50

**Verify Affiliate Totals:**
```sql
SELECT 
  code,
  total_earnings,
  total_conversions,
  reward_points
FROM affiliates
WHERE code = 'TEST-AFFILIATE-1';
```

**Expected:**
- `total_earnings` = $10.50
- `total_conversions` = 1
- `reward_points` = 2 (1 point per $10 profit, rounded down)

---

### ✅ Test 3: Customer Lifetime Tie

**Purpose:** Verify that once a customer is tied to an affiliate, all future purchases credit that affiliate.

**Steps:**
1. Make a purchase with affiliate code `TEST-AFFILIATE-1` (from Test 2)
2. Make a second purchase WITHOUT affiliate code
3. Check that commission still goes to `TEST-AFFILIATE-1`

**Verify Customer Tie:**
```sql
SELECT 
  email,
  referred_by_affiliate_id,
  total_purchases,
  total_profit_generated
FROM affiliate_customers
WHERE referred_by_affiliate_id = (SELECT id FROM affiliates WHERE code = 'TEST-AFFILIATE-1');
```

**Expected:**
- Customer record exists
- `total_purchases` = 2
- `total_profit_generated` = sum of both purchases

---

### ✅ Test 4: MLM Multi-Level Commissions

**Purpose:** Test that Level 1 and Level 2 affiliates receive bonuses.

**Setup:**
- TEST-AFFILIATE-1 (main)
- TEST-AFFILIATE-2 (referred by TEST-AFFILIATE-1)
- TEST-AFFILIATE-3 (referred by TEST-AFFILIATE-2)

**Steps:**
1. Make purchase with `TEST-AFFILIATE-3` code
2. Check commissions for all three affiliates

**Verify MLM Earnings:**
```sql
-- Level 1 (TEST-AFFILIATE-2) should get 2%
SELECT 
  me.level,
  me.amount,
  a.code as affiliate_code
FROM mlm_earnings me
JOIN affiliates a ON me.affiliate_id = a.id
WHERE a.code = 'TEST-AFFILIATE-2';

-- Level 2 (TEST-AFFILIATE-1) should get 1%
SELECT 
  me.level,
  me.amount,
  a.code as affiliate_code
FROM mlm_earnings me
JOIN affiliates a ON me.affiliate_id = a.id
WHERE a.code = 'TEST-AFFILIATE-1';
```

**Expected:**
- TEST-AFFILIATE-3: 42% commission
- TEST-AFFILIATE-2: 2% MLM bonus
- TEST-AFFILIATE-1: 1% MLM bonus

---

### ✅ Test 5: Affiliate Dashboard API

**Purpose:** Verify dashboard endpoint returns correct data.

**Test Endpoint:**
```bash
curl "http://localhost:3000/api/affiliates/dashboard?affiliate_code=TEST-AFFILIATE-1"
```

**Expected Response:**
```json
{
  "affiliate": {
    "code": "TEST-AFFILIATE-1",
    "total_earnings": 10.50,
    "total_clicks": 1,
    "total_conversions": 1,
    "reward_points": 2
  },
  "stats": {
    "total_customers": 1,
    "level1_affiliates": 1,
    "level2_affiliates": 1
  }
}
```

---

### ✅ Test 6: Payout Settings

**Purpose:** Test getting and updating payout settings.

**Get Settings:**
```bash
curl "http://localhost:3000/api/affiliates/payout-settings?userId=<USER_ID>"
```

**Update Settings:**
```bash
curl -X POST "http://localhost:3000/api/affiliates/payout-settings" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<USER_ID>",
    "paypal_email": "new-email@example.com",
    "payment_threshold": 100.00
  }'
```

**Verify in Database:**
```sql
SELECT 
  code,
  paypal_email,
  payment_threshold
FROM affiliates
WHERE code = 'TEST-AFFILIATE-1';
```

---

### ✅ Test 7: Commission Calculation API (Manual Test)

**Purpose:** Test commission calculation endpoint directly.

**Test Endpoint:**
```bash
curl -X POST "http://localhost:3000/api/affiliates/calculate-commission" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-ORDER-123",
    "email": "test-customer@example.com",
    "profit": 24.99,
    "affiliate_code": "TEST-AFFILIATE-1"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order_id": "TEST-ORDER-123",
  "breakdown": {
    "original_profit": 24.99,
    "adjusted_profit": 24.99,
    "affiliate_commission": 10.50,
    "mlm_level1": 0,
    "mlm_level2": 0,
    "king_midas": 2.00,
    "secret_santa": 0.75,
    "company": 11.74
  },
  "referring_affiliate": {
    "id": "...",
    "code": "TEST-AFFILIATE-1"
  }
}
```

---

### ✅ Test 8: Payout Threshold Check

**Purpose:** Verify that affiliates can only request payouts above threshold.

**Steps:**
1. Set payment threshold to $50.00
2. Accumulate $49.99 in earnings
3. Try to request payout (should fail)
4. Accumulate $50.01 in earnings
5. Try to request payout (should succeed)

**Check Threshold:**
```sql
SELECT 
  code,
  total_earnings,
  payment_threshold,
  CASE 
    WHEN total_earnings >= payment_threshold THEN 'Eligible'
    ELSE 'Not Eligible'
  END as payout_status
FROM affiliates
WHERE code = 'TEST-AFFILIATE-1';
```

---

### ✅ Test 9: Reward Points System

**Purpose:** Verify reward points are awarded correctly.

**Check Points:**
```sql
SELECT 
  a.code,
  a.reward_points,
  rph.points,
  rph.source,
  rph.description
FROM affiliates a
LEFT JOIN reward_points_history rph ON a.id = rph.affiliate_id
WHERE a.code = 'TEST-AFFILIATE-1'
ORDER BY rph.created_at DESC;
```

**Expected:**
- 1 point per $10 profit
- Points awarded on each sale
- Points visible in dashboard

---

### ✅ Test 10: Employee Discount (Self-Purchase)

**Purpose:** Test affiliate using their own discount code.

**Steps:**
1. Login as affiliate user
2. Use affiliate discount code at checkout
3. Verify discount is applied (42% off)
4. Verify partial points awarded (based on amount paid)

**Verify Discount:**
```sql
SELECT 
  code,
  discount_credit_balance,
  last_discount_use_date
FROM affiliates
WHERE code = 'TEST-AFFILIATE-1';
```

**Expected:**
- `discount_credit_balance` increases
- `last_discount_use_date` is set
- Can only use once per 30 days

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/affiliates/track-click` | POST | Track affiliate link clicks |
| `/api/affiliates/dashboard` | GET | Get affiliate dashboard data |
| `/api/affiliates/payout-settings` | GET/POST | Manage payout settings |
| `/api/affiliates/calculate-commission` | POST | Calculate commission for order |

---

## Database Tables to Monitor

- `affiliates` - Affiliate accounts and stats
- `affiliate_commissions` - Commission records
- `affiliate_customers` - Customer-to-affiliate ties
- `mlm_earnings` - Multi-level marketing bonuses
- `reward_points_history` - Reward points log
- `product_costs` - Product cost tracking

---

## Common Issues & Solutions

### Issue: Commissions not calculating
**Solution:** Check that:
- Product cost is set in `product_costs` table
- Affiliate code is valid and active
- Commission calculation endpoint is called after payment

### Issue: Click tracking not working
**Solution:** Check that:
- Affiliate code exists in database
- Affiliate status is 'active'
- API endpoint `/api/shop/affiliates/track-click` is accessible

### Issue: Payout settings not saving
**Solution:** Check that:
- User ID matches affiliate `user_id`
- PayPal email format is valid
- Payment threshold is >= 0

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check database for correct commission amounts
3. ✅ Test PayPal payout integration (if implemented)
4. ✅ Review payout threshold logic
5. ✅ Test in production environment

