# How to Test the MLM System

## 🚀 Quick Start (5 minutes)

### Step 1: Verify Database Schema is Applied

1. Open Supabase Dashboard → SQL Editor
2. Run this verification query:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'affiliate_customers', 
  'mlm_earnings', 
  'reward_points_history', 
  'secret_santa_pot', 
  'affiliate_discount_codes'
)
ORDER BY table_name;
```

**Expected:** Should return 5 tables

If tables are missing, run the main schema SQL:
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
cat scripts/update-affiliates-mlm-rewards.sql scripts/schema/affiliate/customers.sql scripts/schema/affiliate/mlm-earnings.sql scripts/schema/affiliate/reward-points.sql scripts/schema/affiliate/secret-santa-pot.sql scripts/schema/affiliate/discount-codes.sql | pbcopy
```

Then paste into Supabase SQL Editor and run.

---

### Step 2: Seed Test Data

```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
cat scripts/seeds/test-mlm-data.sql | pbcopy
```

Paste into Supabase SQL Editor and run.

**What this does:**
- Creates referral chains (KING01 → PRO01 → MID01)
- Sets reward points
- Creates test customers
- Sets some affiliates to discount mode
- Generates discount codes

---

### Step 3: Start Dev Server

```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
npm run dev
```

Wait for: `➜  Local:   http://localhost:3000/`

---

### Step 4: Get an Affiliate ID

You need an affiliate ID to test. Run this in Supabase SQL Editor:

```sql
SELECT id, affiliate_code, user_id 
FROM affiliates 
WHERE affiliate_code = 'KING01'
LIMIT 1;
```

**Copy the `id` UUID** - you'll need it for testing.

---

## 🧪 Testing Checklist

### ✅ Test 1: View Affiliate Dashboard

1. Navigate to: `http://localhost:3000/affiliate-dashboard`

**What to Check:**
- [ ] Page loads without errors
- [ ] King Midas ticker shows at top
- [ ] Affiliate code displays (KING01)
- [ ] Key metrics show (Earnings, Clicks, Conversions, Rank)
- [ ] **NEW:** MLM Quick Stats row shows:
  - Reward Points
  - Customers count
  - Network Size
  - Credit Balance
- [ ] **NEW:** Mode Switcher component visible
- [ ] **NEW:** Reward Points Badge visible
- [ ] **NEW:** Secret Santa Tracker visible
- [ ] **NEW:** Referral Links component visible
- [ ] **NEW:** MLM Earnings Table visible
- [ ] **NEW:** Referral Tree visible
- [ ] **NEW:** Customer List visible

**If errors:** Check browser console (F12) for API errors

---

### ✅ Test 2: Test Referral Link Tracking

1. Open new tab: `http://localhost:3000/shop?ref=KING01`
2. Open browser console (F12)
3. Run: `document.cookie`
4. Run: `localStorage.getItem('affiliate_ref')`

**Expected:**
- Cookie contains: `affiliate_ref=KING01`
- localStorage contains: `"KING01"`

**What this tests:** Customer referral tracking system

---

### ✅ Test 3: Test Affiliate Signup with Referral

1. Navigate to: `http://localhost:3000/become-affiliate?ref=KING01`

**Expected:**
- Banner shows: "Referred by: KING01"
- Form displays normally

**What this tests:** Affiliate referral capture during signup

---

### ✅ Test 4: Test API Endpoints (Browser Console)

Open browser console (F12) on any page and run these:

#### A. Check Customer Tracking
```javascript
fetch('/api/affiliates/check-customer?email=test@example.com')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** `{ found: false }` or customer data if exists

#### B. Track a Customer
```javascript
fetch('/api/affiliates/track-customer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    affiliate_code: 'KING01'
  })
}).then(r => r.json()).then(console.log)
```

**Expected:** `{ success: true, existing: false, message: "Customer tied to affiliate KING01 forever" }`

#### C. Get MLM Dashboard Data
```javascript
// Replace YOUR_AFFILIATE_ID with the ID from Step 4
fetch('/api/affiliates/mlm-dashboard?affiliate_id=YOUR_AFFILIATE_ID')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Object with `affiliate`, `network`, `earnings`, `discount_code`

#### D. Get Referrals
```javascript
fetch('/api/affiliates/referrals?affiliate_id=YOUR_AFFILIATE_ID&type=all')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Object with `customers`, `level1_affiliates`, `level2_affiliates`, `totals`

#### E. Get Reward Points
```javascript
fetch('/api/affiliates/points-history?affiliate_id=YOUR_AFFILIATE_ID')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Object with `total_points`, `history`, `breakdown`, `secret_santa_estimate`

---

### ✅ Test 5: Test Commission Calculation

#### Regular Sale ($100 profit)
```javascript
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
```

**Expected Breakdown:**
```json
{
  "breakdown": {
    "original_profit": 100,
    "employee_discount": 0,
    "adjusted_profit": 100,
    "affiliate_commission": 42,    // 42%
    "mlm_level1": 2,                // 2%
    "mlm_level2": 1,                // 1%
    "king_midas": 8,                // 8%
    "secret_santa": 3,              // 3% (ALWAYS)
    "company": 47                   // 47%
  }
}
```

**What this tests:** Commission calculation with MLM bonuses

---

### ✅ Test 6: Test Mode Switching

#### Switch to Discount Mode
```javascript
fetch('/api/affiliates/switch-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    affiliate_id: 'YOUR_AFFILIATE_ID',
    new_mode: 'discount'
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
```json
{
  "success": true,
  "mode": "discount",
  "discount_code": "KING01-EMPLOYEE",
  "message": "Successfully switched to discount mode"
}
```

**Then refresh dashboard** - should see:
- [ ] Mode changed to "Discount"
- [ ] Discount code displayed: `KING01-EMPLOYEE`
- [ ] Credit balance visible

#### Try Switching Again (Should Fail)
```javascript
fetch('/api/affiliates/switch-mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    affiliate_id: 'YOUR_AFFILIATE_ID',
    new_mode: 'cash'
  })
}).then(r => r.json()).then(console.log)
```

**Expected:** Error: "Mode can only be changed once per 30 days"

**What this tests:** 30-day mode switch limit

---

### ✅ Test 7: Test Employee Discount Commission

**First:** Make sure affiliate is in discount mode (Test 6)

**Then:** Calculate commission with employee discount:
```javascript
fetch('/api/affiliates/calculate-commission', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 'TEST-002',
    email: 'affiliate@example.com',
    user_id: 'USER_ID_OF_AFFILIATE', // Get from affiliates table
    profit: 100
  })
}).then(r => r.json()).then(console.log)
```

**Expected Breakdown:**
```json
{
  "breakdown": {
    "original_profit": 100,
    "employee_discount": 42,        // Deducted FIRST
    "adjusted_profit": 58,          // Remaining
    "affiliate_commission": 24.36,  // 42% of $58
    "mlm_level1": 1.16,             // 2% of $58
    "mlm_level2": 0.58,             // 1% of $58
    "king_midas": 4.64,             // 8% of $58
    "secret_santa": 1.74,           // 3% of $58 (ALWAYS)
    "company": 27.26                // Remaining
  },
  "buyer_is_affiliate": true
}
```

**What this tests:** Employee discount reduces downstream commissions

---

### ✅ Test 8: Test UI Components

#### A. Mode Switcher
1. Go to dashboard
2. Click "Switch to Discount Mode" (if in cash mode)
3. **Check:**
   - [ ] Mode changes
   - [ ] Discount code appears
   - [ ] Button disabled for 30 days
   - [ ] Days remaining shown

#### B. Reward Points Badge
1. Click "View History" button
2. **Check:**
   - [ ] Points history displays
   - [ ] Breakdown by source shows
   - [ ] Secret Santa estimate visible

#### C. Referral Links
1. Click copy button on customer link
2. **Check:**
   - [ ] Link copied to clipboard
   - [ ] Checkmark appears
   - [ ] Both links (customer & affiliate) visible

#### D. Referral Tree
1. Expand Level 1 affiliate
2. **Check:**
   - [ ] Level 2 affiliates show
   - [ ] Each shows: code, points, earnings, status
   - [ ] Network size accurate

#### E. Customer List
1. Check customer list
2. **Check:**
   - [ ] All customers listed
   - [ ] Sort buttons work
   - [ ] Stats accurate (total customers, purchases, profit)

#### F. MLM Earnings Table
1. Check MLM earnings table
2. **Check:**
   - [ ] Filter buttons work (All, Level 1, Level 2)
   - [ ] Earnings listed with dates
   - [ ] Summary stats accurate

#### G. Secret Santa Tracker
1. Check Secret Santa component
2. **Check:**
   - [ ] Current pot amount shown
   - [ ] Your estimated share calculated
   - [ ] Christmas countdown accurate
   - [ ] "How it works" info visible

---

### ✅ Test 9: Test Reward Points

After running commission calculation (Test 5), check points:

```javascript
fetch('/api/affiliates/points-history?affiliate_id=YOUR_AFFILIATE_ID')
  .then(r => r.json())
  .then(console.log)
```

**Expected:**
- Points increased by 10 (for $100 profit)
- History shows new entry
- Breakdown updated

**What this tests:** Reward points awarded correctly (1 per $10)

---

### ✅ Test 10: Test Secret Santa Pot

#### Check Current Pot
```javascript
fetch('/api/affiliates/secret-santa?affiliate_id=YOUR_AFFILIATE_ID')
  .then(r => r.json())
  .then(console.log)
```

**Expected:**
- Current year pot amount
- Your estimated share
- Total points across all affiliates

#### Add to Pot (No Referrer Sale)
```javascript
fetch('/api/affiliates/calculate-commission', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 'TEST-003',
    email: 'noreferrer@example.com',
    profit: 100
    // No affiliate_code = goes to Secret Santa
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- `secret_santa: 3` (3% of $100)
- Pot increases by $3

**What this tests:** Secret Santa accumulation

---

## 🐛 Troubleshooting

### Issue: "Failed to load dashboard"
**Fix:** 
1. Check Supabase service role key is set in `.env.local`
2. Verify affiliate exists: `SELECT * FROM affiliates WHERE affiliate_code = 'KING01'`
3. Check browser console for API errors

### Issue: "MLM data not showing"
**Fix:**
1. Verify MLM dashboard API works: Test 4C
2. Check affiliate ID is correct
3. Verify `data.mlm` exists in dashboard state

### Issue: "Mode switch fails"
**Fix:**
1. Check `last_mode_change_date` in database
2. Must be NULL or 30+ days ago
3. Verify affiliate_id is correct UUID

### Issue: "Components not rendering"
**Fix:**
1. Check browser console for React errors
2. Verify all imports are correct
3. Check component files exist in `src/components/affiliate/`

### Issue: "API returns 404"
**Fix:**
1. Verify API files exist in `api/affiliates/`
2. Check Vercel dev server is running
3. Restart dev server: `npm run dev`

---

## ✅ Success Criteria

All tests pass if:
- [x] Database schema applied
- [x] Test data seeded
- [x] Dev server running
- [ ] Dashboard loads with all components
- [ ] Referral tracking captures codes
- [ ] Commission calculations accurate
- [ ] MLM bonuses calculate correctly
- [ ] Mode switching works (with 30-day limit)
- [ ] Reward points awarded
- [ ] Secret Santa pot accumulating
- [ ] Network visualization works
- [ ] Customer list shows data
- [ ] All UI components render correctly

---

## 🎯 Quick Test Script

Run this in browser console to test everything at once:

```javascript
// Replace YOUR_AFFILIATE_ID
const AFFILIATE_ID = 'YOUR_AFFILIATE_ID';

// Test all APIs
Promise.all([
  fetch(`/api/affiliates/mlm-dashboard?affiliate_id=${AFFILIATE_ID}`).then(r => r.json()),
  fetch(`/api/affiliates/referrals?affiliate_id=${AFFILIATE_ID}&type=all`).then(r => r.json()),
  fetch(`/api/affiliates/points-history?affiliate_id=${AFFILIATE_ID}`).then(r => r.json()),
  fetch(`/api/affiliates/secret-santa?affiliate_id=${AFFILIATE_ID}`).then(r => r.json())
]).then(results => {
  console.log('✅ All APIs working:', {
    mlm: results[0],
    referrals: results[1],
    points: results[2],
    secretSanta: results[3]
  });
}).catch(err => {
  console.error('❌ API Error:', err);
});
```

---

## 📊 Expected Test Results

After running all tests, you should see:

- ✅ **Dashboard:** All components visible and functional
- ✅ **Referrals:** Customer and affiliate networks populated
- ✅ **Points:** Reward points awarded and displayed
- ✅ **MLM:** Bonuses calculated correctly (2% L1, 1% L2)
- ✅ **Mode:** Switching works with 30-day enforcement
- ✅ **Discount:** Employee discount reduces commissions correctly
- ✅ **Secret Santa:** Pot accumulating and estimates accurate

**Everything working?** 🎉 You're ready for production!

