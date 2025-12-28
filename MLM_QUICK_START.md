# MLM System Quick Start Guide

## 🚀 Ready to Test - 3 Steps

### Step 1: Seed Test Data (2 minutes)

Copy and paste this into your Supabase SQL Editor:

```sql
-- Seed test data SQL to clipboard
```

Run the following command to copy to clipboard:
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
cat scripts/seeds/test-mlm-data.sql | pbcopy
```

Then paste into Supabase SQL Editor and execute.

**What This Does:**
- Creates referral chains (KING01 → PRO01 → MID01)
- Sets reward points based on earnings
- Creates test customer relationships
- Sets some affiliates to discount mode
- Generates discount codes

---

### Step 2: Start Dev Server

```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
npm run dev
```

---

### Step 3: Test Features

#### A. View MLM Dashboard
```
http://localhost:5173/mlm-dashboard
```

**You'll See:**
- ✅ Quick stats (points, customers, network, credit balance)
- ✅ Mode switcher (Cash ↔ Discount)
- ✅ Reward points badge
- ✅ Secret Santa tracker with Christmas countdown
- ✅ Referral links (customer & affiliate)
- ✅ MLM earnings table
- ✅ Referral tree (expandable Level 1 & 2)
- ✅ Customer list (lifetime ties)

#### B. Test Referral Tracking
```
http://localhost:5173/shop?ref=KING01
```

Open browser console and check:
```javascript
document.cookie // Should contain: affiliate_ref=KING01
localStorage.getItem('affiliate_ref') // Should return: "KING01"
```

#### C. Test Affiliate Signup with Referral
```
http://localhost:5173/become-affiliate?ref=KING01
```

**Should see banner:** "Referred by: KING01"

---

## 💰 Test Scenarios

### Scenario 1: Regular Sale ($100 profit)
```javascript
// In browser console:
fetch('/api/affiliates/calculate-commission', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 'TEST-001',
    email: 'test@example.com',
    profit: 100,
    affiliate_code: 'KING01'
  })
}).then(r => r.json()).then(console.log)

// Expected result:
// {
//   "breakdown": {
//     "original_profit": 100,
//     "employee_discount": 0,
//     "adjusted_profit": 100,
//     "affiliate_commission": 42,    // 42%
//     "mlm_level1": 2,                // 2%
//     "mlm_level2": 1,                // 1%
//     "king_midas": 8,                // 8%
//     "secret_santa": 3,              // 3% (ALWAYS)
//     "company": 47                   // 47%
//   }
// }
```

### Scenario 2: Employee Discount Sale ($100 profit)

First, switch an affiliate to discount mode:
```javascript
fetch('/api/affiliates/switch-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    affiliate_id: 'GET_FROM_SUPABASE',
    new_mode: 'discount'
  })
}).then(r => r.json()).then(console.log)

// Expected: { "success": true, "mode": "discount", "discount_code": "KING01-EMPLOYEE" }
```

Then make a sale with employee discount:
```javascript
fetch('/api/affiliates/calculate-commission', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 'TEST-002',
    email: 'affiliate@example.com',
    user_id: 'AFFILIATE_USER_ID',
    profit: 100
  })
}).then(r => r.json()).then(console.log)

// Expected:
// {
//   "breakdown": {
//     "original_profit": 100,
//     "employee_discount": 42,        // Deducted FIRST
//     "adjusted_profit": 58,          // Remaining
//     "affiliate_commission": 24.36,  // 42% of $58
//     "mlm_level1": 1.16,             // 2% of $58
//     "mlm_level2": 0.58,             // 1% of $58
//     "king_midas": 4.64,             // 8% of $58
//     "secret_santa": 1.74,           // 3% of $58 (ALWAYS)
//     "company": 27.26                // Remaining
//   }
// }
```

### Scenario 3: Check Network
```javascript
// Get affiliate's full network
fetch('/api/affiliates/referrals?affiliate_id=YOUR_AFFILIATE_ID&type=all')
  .then(r => r.json())
  .then(console.log)

// Expected:
// {
//   "customers": [...],              // Lifetime customer ties
//   "level1_affiliates": [...],      // Direct referrals
//   "level2_affiliates": [...],      // Indirect referrals
//   "totals": {
//     "total_customers": 2,
//     "total_level1_affiliates": 1,
//     "total_level2_affiliates": 1,
//     "total_network_size": 2
//   }
// }
```

### Scenario 4: Check Reward Points
```javascript
fetch('/api/affiliates/points-history?affiliate_id=YOUR_AFFILIATE_ID')
  .then(r => r.json())
  .then(console.log)

// Expected:
// {
//   "total_points": 42,
//   "history": [...],
//   "breakdown": {
//     "from_sales": 30,
//     "from_self_purchase": 10,
//     "from_bonus": 2
//   },
//   "secret_santa_estimate": 12.50
// }
```

---

## 🎯 Key Features to Test

### 1. Lifetime Customer Ties ✅
- Customer clicks `?ref=KING01`
- Makes first purchase → tied to KING01 forever
- Returns later → KING01 still earns commission
- **No other affiliate can claim them**

### 2. MLM Bonuses ✅
- KING01 refers PRO01
- PRO01 makes sale → KING01 earns 2%
- PRO01 refers MID01
- MID01 makes sale → PRO01 earns 2%, KING01 earns 1%

### 3. Employee Discount ✅
- Switch to discount mode (once per 30 days)
- Discount code auto-generated: `CODE-EMPLOYEE`
- Self-purchase: 42% deducted FIRST
- Downstream commissions on remaining profit

### 4. Reward Points ✅
- 1 point per $10 profit (floor division)
- $100 sale = 10 points
- $58 remaining (after discount) = 5 points
- Powers Secret Santa distribution

### 5. Secret Santa ✅
- Accumulates unclaimed 3% all year
- Distributed Christmas weighted by points
- Formula: `(your_points / total_points) × pot_amount`
- All active affiliates with points get share

---

## 📊 Test Data Overview

### Referral Chains
```
KING01 → PRO01 → MID01 → NEW01
KING02 → PRO04 → MID04

KING03 → PRO06
PRO02 → MID06
```

### Test Affiliates by Tier
- **KING (5)**: Top earners, most points
- **PRO (10)**: Professional tier
- **MID (15)**: Mid-tier
- **NEW (18)**: New affiliates
- **Special (2)**: INACTIVE, SUSPEND

**Total: 50 test affiliates**

All have:
- ✅ 42% commission rate
- ✅ Referral relationships
- ✅ Customer ties
- ✅ Reward points
- ✅ Some in discount mode

---

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify:

### Check Referral Chains
```sql
SELECT 
  a1.affiliate_code as affiliate,
  a2.affiliate_code as referred_by,
  a1.reward_points,
  a1.commission_mode
FROM affiliates a1
LEFT JOIN affiliates a2 ON a1.referred_by = a2.id
WHERE a1.affiliate_code IN ('KING01', 'PRO01', 'MID01', 'NEW01')
ORDER BY a1.affiliate_code;
```

### Check Customer Ties
```sql
SELECT 
  ac.email,
  a.affiliate_code,
  ac.total_purchases,
  ac.total_profit_generated
FROM affiliate_customers ac
JOIN affiliates a ON ac.referred_by_affiliate_id = a.id
ORDER BY ac.created_at DESC
LIMIT 10;
```

### Check Discount Codes
```sql
SELECT 
  a.affiliate_code,
  a.commission_mode,
  dc.code,
  dc.is_active
FROM affiliates a
LEFT JOIN affiliate_discount_codes dc ON a.id = dc.affiliate_id
WHERE a.commission_mode = 'discount';
```

### Check Secret Santa Pot
```sql
SELECT 
  year,
  total_amount,
  distributed,
  distribution_date
FROM secret_santa_pot
ORDER BY year DESC;
```

---

## 🎨 UI Components Checklist

### ModeSwitcher
- [ ] Shows current mode (Cash or Discount)
- [ ] Switch button enabled/disabled correctly
- [ ] 30-day countdown shows
- [ ] Warning messages display
- [ ] Mode changes successfully

### RewardPointsBadge
- [ ] Large points display (whole numbers)
- [ ] Points breakdown by source
- [ ] Secret Santa estimate
- [ ] Points history table
- [ ] Expandable/collapsible

### ReferralLink
- [ ] Customer link displayed
- [ ] Affiliate link displayed
- [ ] Copy buttons work
- [ ] Share buttons work (if supported)
- [ ] Pro tips shown

### CustomerList
- [ ] All customers listed
- [ ] Sortable columns
- [ ] Summary stats accurate
- [ ] Email, purchases, profit shown
- [ ] Empty state if no customers

### ReferralTree
- [ ] Level 1 affiliates shown
- [ ] Expandable to Level 2
- [ ] Shows: code, points, earnings, status
- [ ] Network size accurate
- [ ] Empty state if no network

### DiscountCodeDisplay
- [ ] Code displayed correctly
- [ ] Copy button works
- [ ] Credit balance shown
- [ ] Usage instructions clear
- [ ] Only shows in discount mode

### SecretSantaTracker
- [ ] Current pot amount
- [ ] Your estimated share
- [ ] Christmas countdown
- [ ] "How it works" info
- [ ] Warning if no points

### MLMEarningsTable
- [ ] All MLM earnings listed
- [ ] Filter by level works
- [ ] Shows: date, from, level, profit, bonus
- [ ] Summary stats accurate
- [ ] Empty state if no earnings

---

## ✅ Success Criteria

All features working if:
- [x] Database schema applied
- [x] Test data seeded
- [x] Dev server running
- [ ] All API endpoints respond correctly
- [ ] All UI components render
- [ ] Referral tracking captures codes
- [ ] Commission calculations accurate
- [ ] MLM bonuses calculated correctly
- [ ] Mode switching enforced
- [ ] Reward points awarded
- [ ] Secret Santa pot accumulating
- [ ] Network visualization works
- [ ] Customer list shows data

---

## 🎉 You're Ready!

The MLM system is **feature-complete** and ready to test. All you need to do is:

1. ✅ Seed the test data (already provided script)
2. ✅ Start dev server (`npm run dev`)
3. ✅ Navigate to `/mlm-dashboard`
4. ✅ Test the features above

**Everything is built and ready to go!** 🚀

---

## 📞 Need Help?

Check these if something's not working:
1. **Environment variables** - Service role key set?
2. **Database schema** - Run verification queries
3. **Test data** - Seeded correctly?
4. **Browser console** - Any errors?
5. **Network tab** - API calls succeeding?

See `TESTING_GUIDE.md` for detailed troubleshooting.



