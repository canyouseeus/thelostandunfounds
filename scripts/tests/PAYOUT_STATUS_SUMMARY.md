# Payout Status Summary

## ✅ What's Working

1. **Payment Flow** - PayPal checkout works ✅
2. **Commission Creation** - Commissions are created when orders are placed ✅
3. **Payout Settings API** - Can get/update PayPal email and threshold ✅

## ⚠️ Current Issue

**Commission Status: `pending`** - The commission from your recent payment is still `pending` instead of `approved`.

### Why This Happens

The commission flow works like this:
1. ✅ Order created → Commission created (`status: 'pending'`)
2. ❓ Payment approved → Should call `/api/shop/payments/paypal/capture`
3. ❓ Capture endpoint → Should update commission to `status: 'approved'`

### Possible Causes

1. **Capture endpoint not called** - User didn't land on `/payment/success` page
2. **Capture endpoint failed** - PayPal API error or order ID mismatch
3. **Order ID mismatch** - PayPal `token` parameter doesn't match database `order_id`

## 🔧 Quick Fix: Manually Approve Commission

Run this SQL in Supabase to approve the pending commission:

```sql
-- Step 1: Find your pending commission
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

-- Step 2: Approve it (replace ORDER_ID with your actual order ID)
UPDATE affiliate_commissions 
SET status = 'approved'
WHERE order_id = 'YOUR_ORDER_ID_HERE'
  AND status = 'pending';

-- Step 3: Update affiliate totals
UPDATE affiliates
SET 
  total_earnings = total_earnings + (
    SELECT amount 
    FROM affiliate_commissions 
    WHERE order_id = 'YOUR_ORDER_ID_HERE'
  ),
  total_conversions = total_conversions + 1
WHERE id = (
  SELECT affiliate_id 
  FROM affiliate_commissions 
  WHERE order_id = 'YOUR_ORDER_ID_HERE'
);

-- Step 4: Verify
SELECT 
  ac.order_id,
  ac.status,
  ac.amount,
  a.code,
  a.total_earnings,
  a.total_conversions
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
WHERE ac.order_id = 'YOUR_ORDER_ID_HERE';
```

## 🔍 Debugging Steps

1. **Check browser console** - When you land on `/payment/success`, check for:
   - `🔍 Payment success page - URL params:` - Should show `token` parameter
   - `📥 Calling capture endpoint` - Should show API call
   - `✅ Payment captured` - Should show success

2. **Check server logs** - Look for:
   - `💰 Capturing PayPal order:` - Shows capture endpoint was called
   - `✅ PayPal order captured:` - Shows PayPal API success
   - `✅ Commission approved` - Shows database update success

3. **Verify order ID** - Make sure PayPal's `token` matches database `order_id`

## 📋 Next Steps

1. **Test capture flow** - Make another test purchase and watch console logs
2. **Fix capture endpoint** - If it's failing, check PayPal API credentials
3. **Set up payout settings** - Configure PayPal email for affiliates
4. **Test payout eligibility** - Verify affiliates can see payout status

## 💡 Payout System Status

**Current State:**
- ✅ Commissions tracked
- ✅ Payout settings API exists
- ⚠️ Capture endpoint may not be working automatically
- ❌ No automatic payout processing (manual for now)

**Workflow:**
1. Affiliates earn commissions → `total_earnings` increases
2. When `total_earnings >= payment_threshold` → Eligible for payout
3. Admin manually processes payouts via PayPal
4. Admin updates commission status to `paid`

