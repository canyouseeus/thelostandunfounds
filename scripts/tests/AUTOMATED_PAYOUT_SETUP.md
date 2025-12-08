# Automated Payout System Setup Guide

## ✅ What's Been Created

### 1. Database Schema
- **`payout_requests` table** - Tracks payout requests and PayPal processing
- Run: `scripts/schema/affiliate/create-payout-requests-table.sql`

### 2. API Endpoints

#### Affiliate Endpoints:
- **`POST /api/affiliates/request-payout`** - Request a payout
  ```bash
  curl -X POST "http://localhost:3000/api/affiliates/request-payout" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "<USER_ID>",
      "amount": 100.00
    }'
  ```

#### Admin Endpoints:
- **`POST /api/admin/process-payouts`** - Process pending payouts
  ```bash
  # Process all pending payouts
  curl -X POST "http://localhost:3000/api/admin/process-payouts" \
    -H "Content-Type: application/json" \
    -d '{"processAll": true}'
  
  # Process specific payout
  curl -X POST "http://localhost:3000/api/admin/process-payouts" \
    -H "Content-Type: application/json" \
    -d '{"payoutRequestId": "<PAYOUT_REQUEST_ID>"}'
  ```

#### Cron Job:
- **`POST /api/cron/process-payouts`** - Automatic processing (runs hourly)

## 🚀 Setup Steps

### Step 1: Create Database Table

Run this SQL in Supabase:
```sql
-- File: scripts/schema/affiliate/create-payout-requests-table.sql
```

### Step 2: Configure Environment Variables

Ensure these are set in Vercel:
- `PAYPAL_CLIENT_ID` - PayPal API client ID
- `PAYPAL_CLIENT_SECRET` - PayPal API client secret
- `PAYPAL_ENVIRONMENT` - `sandbox` or `production`
- `CRON_SECRET` (optional) - Secret for cron job authentication

### Step 3: Set Up Vercel Cron Job

The cron job is configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-payouts",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

**Note:** Vercel Cron Jobs require a Pro plan. For free tier, you can:
- Use external cron service (cron-job.org, EasyCron, etc.)
- Call the endpoint manually
- Use Vercel's scheduled functions (if available)

### Step 4: Test the Flow

1. **Affiliate requests payout:**
   ```bash
   curl -X POST "http://localhost:3000/api/affiliates/request-payout" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "<USER_ID>",
       "amount": 100.00
     }'
   ```

2. **Check pending requests:**
   ```sql
   SELECT * FROM payout_requests WHERE status = 'pending';
   ```

3. **Process payouts (manual or automatic):**
   ```bash
   curl -X POST "http://localhost:3000/api/admin/process-payouts" \
     -H "Content-Type: application/json" \
     -d '{"processAll": true}'
   ```

4. **Verify completion:**
   ```sql
   SELECT * FROM payout_requests WHERE status = 'completed';
   ```

## 🔄 How It Works

### Automated Flow:

1. **Affiliate earns commissions** → Commissions marked as `approved`
2. **Affiliate requests payout** → Creates `payout_requests` record (`status: 'pending'`)
3. **Cron job runs hourly** → Calls `/api/cron/process-payouts`
4. **Process payouts endpoint** → 
   - Gets all `pending` payout requests
   - Creates PayPal Payouts API batch
   - Sends money to affiliate's PayPal email
   - Updates `payout_requests` status to `completed`
   - Marks commissions as `paid`

### Manual Flow:

Admins can also trigger processing manually:
```bash
POST /api/admin/process-payouts
{
  "processAll": true  // or "payoutRequestId": "<ID>"
}
```

## 📋 Payout Request Validation

The system validates:
- ✅ PayPal email is set
- ✅ Amount meets payment threshold
- ✅ Amount doesn't exceed available earnings
- ✅ No existing pending payout request

## 💰 PayPal Payouts API

The system uses PayPal's **Payouts API** (not regular payments):
- Endpoint: `/v1/payments/payouts`
- Batch payouts for multiple recipients
- Email-based payouts (no PayPal account required)
- Automatic processing

**Note:** PayPal Payouts API requires:
- Business PayPal account
- API access enabled
- Sufficient balance for payouts

## 🔍 Monitoring

### Check Pending Payouts:
```sql
SELECT 
  pr.id,
  pr.amount,
  pr.status,
  pr.created_at,
  a.code as affiliate_code,
  a.paypal_email
FROM payout_requests pr
JOIN affiliates a ON pr.affiliate_id = a.id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;
```

### Check Completed Payouts:
```sql
SELECT 
  pr.id,
  pr.amount,
  pr.paypal_payout_batch_id,
  pr.processed_at,
  a.code as affiliate_code
FROM payout_requests pr
JOIN affiliates a ON pr.affiliate_id = a.id
WHERE pr.status = 'completed'
ORDER BY pr.processed_at DESC;
```

### Check Failed Payouts:
```sql
SELECT 
  pr.id,
  pr.amount,
  pr.error_message,
  pr.created_at,
  a.code as affiliate_code
FROM payout_requests pr
JOIN affiliates a ON pr.affiliate_id = a.id
WHERE pr.status = 'failed'
ORDER BY pr.created_at DESC;
```

## ⚠️ Important Notes

1. **PayPal Sandbox Testing**: Use sandbox PayPal accounts for testing
2. **Minimum Payout**: PayPal has a $1.00 minimum for payouts
3. **Fees**: PayPal charges fees for payouts (check current rates)
4. **Processing Time**: PayPal payouts can take 1-3 business days
5. **Error Handling**: Failed payouts are logged with error messages

## 🐛 Troubleshooting

### Payouts Not Processing:
1. Check cron job is running (Vercel dashboard)
2. Check PayPal credentials are correct
3. Check PayPal account has sufficient balance
4. Review error messages in `payout_requests.error_message`

### PayPal API Errors:
- Check PayPal API credentials
- Verify PayPal account is business account
- Check API access is enabled
- Review PayPal API documentation for error codes

## 📚 Next Steps

1. ✅ Run database migration
2. ✅ Test payout request endpoint
3. ✅ Test manual payout processing
4. ✅ Set up Vercel cron job (or external cron)
5. ✅ Monitor payout processing
6. ✅ Add payout history UI (optional)

