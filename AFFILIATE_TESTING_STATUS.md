# Affiliate Program Testing Status

**Last Updated:** 2025-01-27

## 📊 Overall Status: **~70% Complete**

### ✅ Completed Tests

#### Test 1: Affiliate Click Tracking ✅
- **Status:** ✅ PASSED
- **Evidence:** `test-affiliate-tracking.md` confirms tracking works for `KING01`
- **Notes:** Cookie persistence works correctly (may need to clear cookies to test different codes)

#### Test 2: Commission Calculation (New Customer) ⚠️
- **Status:** ⚠️ PARTIALLY TESTED
- **Evidence:** Commission creation works, but approval flow needs verification
- **Known Issue:** Commissions may remain `pending` if PayPal capture endpoint isn't called
- **Fix Available:** Manual approval SQL script exists (`approve-all-commissions.sql`)

#### Test 3: Customer Lifetime Tie ❓
- **Status:** ❓ NOT VERIFIED
- **Needs Testing:** Verify second purchase without affiliate code still credits original affiliate

#### Test 4: MLM Multi-Level Commissions ❓
- **Status:** ❓ NOT VERIFIED
- **Needs Testing:** Test referral chain (TEST-AFFILIATE-1 → TEST-AFFILIATE-2 → TEST-AFFILIATE-3)

#### Test 5: Affiliate Dashboard API ✅
- **Status:** ✅ IMPLEMENTED
- **Endpoint:** `/api/affiliates/dashboard?affiliate_code=CODE`
- **Needs Testing:** Verify response matches expected format

#### Test 6: Payout Settings ✅
- **Status:** ✅ IMPLEMENTED & TESTED
- **Endpoints:** 
  - GET `/api/affiliates/payout-settings?userId=xxx`
  - POST `/api/affiliates/payout-settings`
- **Evidence:** `PAYOUT_TESTING_GUIDE.md` confirms this works

#### Test 7: Commission Calculation API (Manual) ❓
- **Status:** ❓ NOT TESTED
- **Endpoint:** POST `/api/affiliates/calculate-commission`
- **Needs Testing:** Test with sample order data

#### Test 8: Payout Threshold Check ✅
- **Status:** ✅ IMPLEMENTED
- **Evidence:** `request-payout.ts` includes threshold validation
- **Needs Testing:** Verify threshold enforcement works

#### Test 9: Reward Points System ❓
- **Status:** ❓ NOT VERIFIED
- **Needs Testing:** Verify points awarded correctly (1 point per $10 profit)

#### Test 10: Employee Discount (Self-Purchase) ❓
- **Status:** ❓ NOT VERIFIED
- **Needs Testing:** Test affiliate using own discount code

---

## 🔧 Implementation Status

### ✅ Fully Implemented
- [x] Affiliate click tracking
- [x] Commission creation on order
- [x] Payout settings API (GET/POST)
- [x] Request payout endpoint (`/api/affiliates/request-payout`)
- [x] Payout requests table schema
- [x] Admin payout processing endpoint (`/api/admin/process-payouts`)
- [x] Dashboard API endpoint
- [x] MLM dashboard endpoint

### ⚠️ Partially Implemented
- [ ] Commission approval flow (may not auto-approve on payment capture)
- [ ] PayPal payout processing (endpoint exists but needs testing)

### ❌ Not Implemented
- [ ] Automated payout processing (manual workflow exists)
- [ ] Payout history UI
- [ ] Email notifications for payouts

---

## 📋 Testing Checklist

### Core Functionality
- [x] Click tracking works
- [ ] Commission calculation on purchase
- [ ] Commission approval on payment capture
- [ ] Customer lifetime tie
- [ ] MLM bonuses (Level 1 & 2)
- [ ] Reward points calculation
- [ ] Dashboard displays correct data

### Payout System
- [x] Payout settings can be retrieved
- [x] Payout settings can be updated
- [x] Payout request endpoint exists
- [ ] Payout threshold enforcement tested
- [ ] Admin payout processing tested
- [ ] PayPal payout integration tested

### UI Components
- [ ] Affiliate dashboard renders correctly
- [ ] Payout settings form works
- [ ] Request payout button works
- [ ] Commission history displays
- [ ] Referral tree displays

---

## 🚨 Known Issues

### Issue 1: Commission Approval Flow
**Problem:** Commissions may remain `pending` after payment
**Status:** ⚠️ Needs investigation
**Workaround:** Manual approval via SQL (`approve-all-commissions.sql`)
**Files:**
- `scripts/tests/approve-all-commissions.sql`
- `PAYOUT_STATUS_SUMMARY.md` (has debugging steps)

### Issue 2: Cookie Persistence
**Problem:** Affiliate cookies persist, making it hard to test different codes
**Status:** ✅ Expected behavior
**Solution:** Clear cookies or use incognito mode for testing
**Files:**
- `scripts/tests/test-affiliate-tracking.md`

---

## 📁 Test Files Reference

### Test Data Setup
- `scripts/tests/affiliate-program-test.sql` - Creates TEST-AFFILIATE-1, 2, 3
- `scripts/seeds/affiliate/seed-50-affiliates.sql` - Creates KING01, PRO01, etc.

### Testing Guides
- `scripts/tests/AFFILIATE_TESTING_GUIDE.md` - Complete 10-test guide
- `scripts/tests/PAYOUT_TESTING_GUIDE.md` - Payout-specific testing
- `scripts/tests/test-affiliate-tracking.md` - Click tracking test results
- `scripts/tests/PAYOUT_STATUS_SUMMARY.md` - Payout debugging guide

### SQL Scripts
- `scripts/tests/approve-all-commissions.sql` - Manually approve pending commissions
- `scripts/tests/set-paypal-emails.sql` - Set PayPal emails for test affiliates
- `scripts/tests/verify-affiliate-setup.sql` - Verify test data exists

### API Test Scripts
- `scripts/tests/test-payout-request.sh` - Test payout request endpoint

---

## 🎯 Next Steps

### Priority 1: Complete Core Testing
1. **Test commission approval flow**
   - Make a test purchase
   - Verify commission is created
   - Verify commission is approved after payment capture
   - If not auto-approved, investigate capture endpoint

2. **Test customer lifetime tie**
   - Make purchase with affiliate code
   - Make second purchase without code
   - Verify both commissions go to same affiliate

3. **Test MLM bonuses**
   - Use TEST-AFFILIATE-3 code
   - Verify TEST-AFFILIATE-2 gets 2% bonus
   - Verify TEST-AFFILIATE-1 gets 1% bonus

### Priority 2: Payout System Testing
1. **Test payout request endpoint**
   - Set PayPal email for test affiliate
   - Accumulate earnings above threshold
   - Request payout via API
   - Verify payout request is created

2. **Test admin payout processing**
   - Create payout request
   - Process via admin endpoint
   - Verify PayPal payout is created
   - Verify commission status updates

### Priority 3: UI Testing
1. **Test affiliate dashboard**
   - Verify all data displays correctly
   - Test payout settings form
   - Test request payout button

2. **Test admin views**
   - Verify payout requests list
   - Test payout processing UI

---

## 📊 Test Coverage Summary

| Category | Tests | Passed | Failed | Not Tested |
|----------|-------|--------|--------|------------|
| Click Tracking | 1 | 1 | 0 | 0 |
| Commission Calculation | 2 | 0 | 0 | 2 |
| Customer Tracking | 1 | 0 | 0 | 1 |
| MLM System | 1 | 0 | 0 | 1 |
| Dashboard APIs | 1 | 0 | 0 | 1 |
| Payout Settings | 1 | 1 | 0 | 0 |
| Payout Requests | 1 | 0 | 0 | 1 |
| Reward Points | 1 | 0 | 0 | 1 |
| Employee Discount | 1 | 0 | 0 | 1 |
| **Total** | **10** | **2** | **0** | **8** |

---

## 💡 Quick Test Commands

### Check Test Data Exists
```sql
SELECT code, status, total_earnings, paypal_email 
FROM affiliates 
WHERE code LIKE 'TEST-%' OR code LIKE 'KING%';
```

### Check Recent Commissions
```sql
SELECT 
  ac.id,
  ac.order_id,
  ac.amount,
  ac.status,
  a.code as affiliate_code
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
ORDER BY ac.created_at DESC
LIMIT 10;
```

### Test Click Tracking
```bash
# Visit in browser (clear cookies first)
http://localhost:3000/shop?ref=TEST-AFFILIATE-1

# Check console for: ✅ Affiliate click tracked
```

### Test Dashboard API
```bash
curl "http://localhost:3000/api/affiliates/dashboard?affiliate_code=TEST-AFFILIATE-1"
```

### Test Payout Settings
```bash
# Get settings
curl "http://localhost:3000/api/affiliates/payout-settings?userId=<USER_ID>"

# Update settings
curl -X POST "http://localhost:3000/api/affiliates/payout-settings" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<USER_ID>", "paypal_email": "test@example.com", "payment_threshold": 50.00}'
```

---

## 📝 Notes

- Most core functionality is **implemented** but **not fully tested**
- The payout system is more complete than the testing guide indicates
- Main gap is in **end-to-end testing** of the full purchase → commission → payout flow
- Need to verify **PayPal capture endpoint** properly approves commissions














