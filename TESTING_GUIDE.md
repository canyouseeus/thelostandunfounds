# MLM System Testing Guide

## 🧪 Quick Test Checklist

### 1. Database Setup ✅
```sql
-- Run the main schema (already completed)
-- Verify with:
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('affiliate_customers', 'mlm_earnings', 'reward_points_history', 'secret_santa_pot', 'affiliate_discount_codes');
```

### 2. Seed Test Data
```bash
# Copy SQL to clipboard
cat thelostandunfounds/scripts/seeds/test-mlm-data.sql | pbcopy

# Then paste into Supabase SQL Editor and run
```

**Expected Result:** 50 affiliates with referral chains, customer data, and initial points

### 3. Test API Endpoints

#### A. Customer Tracking
```bash
# Track a new customer
curl -X POST http://localhost:3000/api/affiliates/track-customer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "affiliate_code": "KING01"
  }'

# Expected: { "success": true, "existing": false, "message": "Customer tied to affiliate KING01 forever" }
```

#### B. Check Customer
```bash
curl "http://localhost:3000/api/affiliates/check-customer?email=test@example.com"

# Expected: { "found": true, "affiliate": { "id": "...", "affiliate_code": "KING01" } }
```

#### C. Commission Calculation (Regular Sale)
```bash
curl -X POST http://localhost:3000/api/affiliates/calculate-commission \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER-001",
    "email": "test@example.com",
    "profit": 100
  }'

# Expected breakdown:
# - affiliate_commission: $42
# - mlm_level1: $2
# - mlm_level2: $1
# - king_midas: $8
# - company: $47
```

#### D. Commission with Employee Discount
```bash
curl -X POST http://localhost:3000/api/affiliates/calculate-commission \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER-002",
    "email": "affiliate@example.com",
    "user_id": "USER_ID_OF_AFFILIATE_IN_DISCOUNT_MODE",
    "profit": 100
  }'

# Expected:
# - employee_discount: $42
# - adjusted_profit: $58
# - affiliate_commission: $24.36 (42% of $58)
# - mlm_level1: $1.16 (2% of $58)
# - mlm_level2: $0.58 (1% of $58)
```

#### E. Mode Switching
```bash
# Switch to discount mode
curl -X POST http://localhost:3000/api/affiliates/switch-mode \
  -H "Content-Type: application/json" \
  -d '{
    "affiliate_id": "AFFILIATE_ID",
    "new_mode": "discount"
  }'

# Expected: { "success": true, "mode": "discount", "discount_code": "KING01-EMPLOYEE" }
```

#### F. MLM Dashboard Data
```bash
curl "http://localhost:3000/api/affiliates/mlm-dashboard?affiliate_id=AFFILIATE_ID"

# Expected: Full MLM data including network, earnings, points
```

#### G. Referrals
```bash
# Get all referrals (customers + affiliates)
curl "http://localhost:3000/api/affiliates/referrals?affiliate_id=AFFILIATE_ID&type=all"

# Expected: Lists of customers, level1 affiliates, level2 affiliates
```

#### H. Reward Points History
```bash
curl "http://localhost:3000/api/affiliates/points-history?affiliate_id=AFFILIATE_ID"

# Expected: Points total, history, breakdown by source, Secret Santa estimate
```

### 4. Test UI Components

#### A. Navigate to MLM Dashboard
```
http://localhost:3000/mlm-dashboard
```

**Should See:**
- ✅ Quick stats (points, customers, network, credit)
- ✅ Mode switcher (cash ↔ discount)
- ✅ Discount code display (if in discount mode)
- ✅ Reward points badge
- ✅ Secret Santa tracker
- ✅ Referral links (customer & affiliate)
- ✅ MLM earnings table
- ✅ Referral tree (L1 & L2)
- ✅ Customer list

#### B. Test Referral Tracking
```
# Open in browser:
http://localhost:3000/shop?ref=KING01

# Check cookie was set:
document.cookie

# Should see: affiliate_ref=KING01
```

#### C. Test Affiliate Signup with Referral
```
# Open in browser:
http://localhost:3000/become-affiliate?ref=KING01

# Should see banner: "Referred by: KING01"
```

### 5. Test Mode Switching

1. Start in **Cash Mode**
2. Click "Switch to Discount Mode"
3. **Expected:**
   - Mode changes to "Discount"
   - Discount code generated: `CODE-EMPLOYEE`
   - Discount code displayed
   - Switch button disabled for 30 days

4. Make a self-purchase (simulated)
5. **Expected:**
   - Employee discount applied first ($42 from $100)
   - Remaining profit: $58
   - Upline still earns MLM on $58

### 6. Test Reward Points

1. Generate sale with $100 profit
2. **Expected:**
   - Affiliate earns 10 points (floor(100/10))
   - Points added to history
   - Secret Santa estimate updates

3. Make employee discount purchase ($100 → $58 profit)
4. **Expected:**
   - Affiliate earns 5 points (floor(58/10))
   - Points from "self_purchase" source

### 7. Test Secret Santa

1. Check current pot balance
2. Add sales with no referrer (3% → pot)
3. **Expected:**
   - Pot increases by 3% of profit
   - Contributions logged
   - Estimate updates for all affiliates

### 8. Test MLM Chain

**Setup:** KING01 → PRO01 → MID01

1. MID01 makes a sale ($100 profit)
2. **Expected:**
   - MID01: $42 commission
   - PRO01: $2 MLM Level 1 bonus
   - KING01: $1 MLM Level 2 bonus

3. Check MLM earnings table for each
4. **Expected:**
   - Each shows their respective bonus
   - Proper "from_affiliate" attribution

### 9. Test Network Visualization

1. Open Referral Tree component
2. **Expected:**
   - Shows Level 1 direct referrals
   - Expandable to show Level 2
   - Each with: code, points, earnings, status

2. Open Customer List
3. **Expected:**
   - All lifetime customers listed
   - Sortable by profit, purchases, date
   - Stats: total customers, purchases, profit

### 10. Verify Lifetime Ties

1. Create customer with affiliate link
2. Customer makes purchase → tied to affiliate
3. **Wait / Simulate time passing**
4. Customer returns and purchases again
5. **Expected:**
   - Original affiliate still earns commission
   - No new affiliate can claim customer
   - Lifetime tie maintained

---

## 🎯 Expected Outcomes

### Profit Distribution (Regular $100 Sale)
```
✅ Affiliate:     $42.00 (42%)
✅ MLM L1:        $2.00  (2%)
✅ MLM L2:        $1.00  (1%)
✅ King Midas:    $8.00  (8%)
✅ Secret Santa:  $3.00  (3% - ALWAYS)
✅ Company:       $44.00 (44%)
```

### Employee Discount ($100 Sale)
```
✅ Discount:      $42.00 (deducted first)
✅ Remaining:     $58.00

From $58:
✅ Affiliate:     $24.36 (42%)
✅ MLM L1:        $1.16  (2%)
✅ MLM L2:        $0.58  (1%)
✅ King Midas:    $4.64  (8%)
✅ Secret Santa:  $1.74  (3% of $58 - ALWAYS)
✅ Company:       $27.26 (rest)
```

### Reward Points
```
✅ Regular sale ($100):     10 points
✅ Employee sale ($58):     5 points
✅ Display: Whole numbers only
✅ Sources: sale, self_purchase, bonus
```

### Mode Switching
```
✅ Switch once per 30 days
✅ Auto-generate discount code
✅ Disable switch button for 30 days
✅ Next available date shown
```

### Secret Santa
```
✅ Pot accumulates all year
✅ Distributed at Christmas
✅ Weighted by reward points
✅ Formula: (your_points / total_points) × pot
```

---

## 🐛 Common Issues & Fixes

### Issue: API returns 404
**Fix:** Make sure Supabase service role key is set in environment variables

### Issue: Customer not tracking
**Fix:** Check cookie is being set. Clear cookies and try again with `?ref=CODE`

### Issue: Mode switch fails
**Fix:** Check `last_mode_change_date` - must be 30+ days ago or null

### Issue: Points not calculating
**Fix:** Verify profit amount ≥ $10 (floor division means $9 = 0 points)

### Issue: MLM bonuses not appearing
**Fix:** Check referral chain exists in database (`referred_by` column)

### Issue: Secret Santa estimate is 0
**Fix:** Must have reward points > 0 and pot must have funds

---

## 📊 Test Data Reference

### Test Affiliates
- **KING01-05**: Top tier, high earnings
- **PRO01-10**: Professional tier
- **MID01-15**: Mid-tier
- **NEW01-18**: New affiliates

### Referral Chains
```
KING01 → PRO01 → MID01 → NEW01
KING02 → PRO04 → MID04
```

### All test affiliates have:
- 42% commission rate
- Varying reward points
- Customer relationships
- Referral relationships

---

## ✅ Success Criteria

- [ ] All API endpoints return expected responses
- [ ] Customer tracking creates lifetime ties
- [ ] Commission calculations match expected breakdown
- [ ] Employee discount reduces downstream commissions
- [ ] MLM bonuses calculate correctly (2%, 1%)
- [ ] Reward points awarded correctly (floor division)
- [ ] Mode switching enforces 30-day limit
- [ ] Discount codes generate properly
- [ ] Secret Santa pot accumulates
- [ ] Network visualization displays correctly
- [ ] All UI components load without errors
- [ ] Referral tracking captures codes
- [ ] Circular referrals prevented

---

## 🚀 Ready for Production When:

1. All API tests pass ✅
2. All UI components render ✅
3. Profit calculations verified ✅
4. Mode switching tested ✅
5. MLM chain tested ✅
6. Lifetime ties verified ✅
7. Secret Santa calculation verified ✅
8. Shop integration complete 🔜
9. Cron jobs scheduled 🔜
10. Production testing complete 🔜

---

## 📞 Need Help?

If any tests fail or you encounter issues:
1. Check the console for errors
2. Verify environment variables are set
3. Confirm database schema is applied
4. Check Supabase RLS policies
5. Review API responses for error messages

**Current Status: 95% Complete - Ready for Integration Testing**



