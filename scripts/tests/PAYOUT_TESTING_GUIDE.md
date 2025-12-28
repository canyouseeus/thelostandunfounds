# Payout Testing Guide

## ✅ What's Already Set Up

1. **Payout Settings API** - `/api/affiliates/payout-settings`
   - GET: Retrieve payout settings (PayPal email, threshold)
   - POST: Update payout settings

2. **Database Columns** - `affiliates` table has:
   - `paypal_email` - PayPal email for receiving payouts
   - `payment_threshold` - Minimum earnings before payout (default: $50.00)

3. **Commission Tracking** - Commissions are:
   - Created when order is placed (status: 'pending')
   - Approved when payment is captured (status: 'approved')
   - Added to `total_earnings` in affiliates table

## 🔍 Step 1: Verify Payment Created Commission

Run this SQL to check if your payment created a commission:

```sql
-- Check latest commissions
SELECT 
  ac.id,
  ac.order_id,
  ac.amount as commission_amount,
  ac.profit_generated,
  ac.status,
  ac.created_at,
  a.code as affiliate_code,
  a.total_earnings,
  a.paypal_email,
  a.payment_threshold
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
ORDER BY ac.created_at DESC
LIMIT 5;
```

**Expected:**
- Commission exists with `status = 'approved'`
- `affiliate.total_earnings` was updated
- Commission amount matches: `(product_price - product_cost) * commission_rate`

## 🔍 Step 2: Check Payout Eligibility

```sql
-- Check if affiliate is eligible for payout
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
WHERE code = 'KING01' -- or your affiliate code
ORDER BY total_earnings DESC;
```

## 🔍 Step 3: Payout API (current flow)

### Get/Update Payout Settings
```bash
# Get current settings
curl "http://localhost:3000/api/affiliates/payout-settings?userId=<YOUR_USER_ID>"

# Update PayPal email / threshold
curl -X POST "http://localhost:3000/api/affiliates/payout-settings" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<YOUR_USER_ID>",
    "paypal_email": "your-paypal@example.com",
    "payment_threshold": 50.00
  }'
```

### Request a Payout (affiliate)
```bash
curl -X POST "http://localhost:3000/api/affiliates/request-payout" \
  -H "Content-Type: application/json" \
  -d '{
    "affiliateCode": "<AFFILIATE_CODE>",
    "amount": 5.00
  }'
```

### Process Payouts (admin or cron)
```bash
# Process all pending
curl -X POST "http://localhost:3000/api/admin/process-payouts" \
  -H "Content-Type: application/json" \
  -d '{"processAll": true}'

# Process a specific payout
curl -X POST "http://localhost:3000/api/admin/process-payouts" \
  -H "Content-Type: application/json" \
  -d '{"payoutRequestId": "<PAYOUT_REQUEST_ID>"}'
```

## 📋 Testing Checklist

- [x] Payment creates commission (status: 'pending')
- [x] Payment capture approves commission (status: 'approved')
- [x] Commission added to `total_earnings`
- [x] Payout settings can be retrieved/updated
- [x] Payout request endpoint works
- [x] PayPal payout processing endpoint works (sandbox/live credentials required)
- [x] Payout history tracking via `payout_requests`

## 🧪 Sandbox Quick Path (Checkout → Payout)
1. Set sandbox env vars (`PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_ENVIRONMENT=sandbox`, optional `PAYPAL_RETURN_URL`).
2. Seed a sandbox affiliate/product cost row: `scripts/tests/setup-sandbox-affiliate.sql` (fill placeholders).
3. Buy a low-price item on `/shop` (sandbox), approve, land on `/payment/success`.
4. Verify commission = (price − cost) × rate, status `approved`; affiliate totals increment; conversions +1.
5. Request payout via `/api/affiliates/request-payout`; process via `/api/admin/process-payouts`.
6. Expect `payout_requests` → `completed`, `affiliate_commissions` → `paid`, PayPal sandbox dashboard shows batch.

## 💡 Current Workflow

**For Affiliates:**
1. Set PayPal email in dashboard: `/affiliate/dashboard`
2. Earn commissions through sales
3. Request payout once earnings meet threshold

**For Admins:**
1. Review payout_requests (pending/processing/failed)
2. Run `/api/admin/process-payouts` (manually or via cron)
3. Confirm PayPal batch + `payout_requests` status + commissions marked `paid`

## 🧭 Log & Dashboard Checks
- App logs: ensure `/api/shop/payments/paypal` returns `success:true` with approvalUrl; capture endpoint logs `Payment captured`.
- Supabase data: `affiliate_commissions` has `approved` then `paid`; `payout_requests` moves pending → processing → completed.
- PayPal sandbox dashboard: order capture visible under Transactions; payout batch visible under Payouts with SUCCESS state.

## ✅ Ready for Production Smoke Test
1. Swap env to live: `PAYPAL_CLIENT_ID/SECRET` (Live), `PAYPAL_ENVIRONMENT=production`, optional `PAYPAL_RETURN_URL=https://thelostandunfounds.com`.
2. Redeploy.
3. Run a $1 live purchase on `/shop` → approve → `/payment/success`.
4. Verify commission math in `affiliate_commissions` (approved) and affiliate totals.
5. Create and process a small payout for a test affiliate; confirm PayPal Live dashboard shows the payout batch and `payout_requests` → `completed` / commissions → `paid`.
6. Roll back env to sandbox if you need to keep testing.

## 🖥️ Admin Affiliate UI Smoke (sandbox or live)
1. Visit `/admin/affiliates` (admin only).
2. Verify Summary, Payout Requests, Affiliates, and Commissions sections load and expand on tap.
3. Click Process All Pending (sandbox) and confirm statuses update + PayPal dashboard shows batch.
4. Edit an affiliate rate/threshold/PayPal email and confirm the values refresh.
5. Add a manual commission and confirm it appears in Recent Commissions.
6. Export CSVs for payouts/affiliates/commissions and confirm files download.

