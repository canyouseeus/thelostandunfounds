# Affiliate Program Setup Guide

This guide explains how to set up and use the affiliate program system.

## Overview

The affiliate program allows users to earn commissions by referring new customers. Key features:

- **50% Commission**: Affiliates earn 50% commission on profit (revenue - costs)
- **Referral Tracking**: Automatic tracking of signups via referral links
- **Commission Calculation**: Automatic calculation when subscriptions are created
- **Cost Tracking**: Track operational costs to calculate accurate commissions
- **PayPal Payouts**: Integrated PayPal payout system
- **Affiliate Dashboard**: Full dashboard for affiliates to track stats and manage links

## Database Setup

1. Run the main database schema first (if not already done):
   ```sql
   -- Run database-schema.sql in Supabase SQL Editor
   ```

2. Run the affiliate schema:
   ```sql
   -- Run affiliate-schema.sql in Supabase SQL Editor
   ```

The affiliate schema creates the following tables:
- `affiliates` - Affiliate accounts
- `referrals` - Referral tracking
- `commissions` - Commission records
- `subscription_costs` - Cost tracking for commission calculations
- `marketing_materials` - Marketing resources for affiliates

## How It Works

### 1. User Registration as Affiliate

Users can register as affiliates by:
- Visiting `/affiliate` page
- Clicking "Register as Affiliate"
- A unique referral code is automatically generated (e.g., "AFF123456")

### 2. Referral Tracking

When a user signs up with a referral link:
- URL format: `https://yoursite.com/?ref=AFF123456` or `https://yoursite.com/pricing?ref=AFF123456`
- The referral code is automatically captured from the URL
- A referral record is created linking the new user to the affiliate

### 3. Commission Calculation

Commissions are automatically calculated when:
- A referred user subscribes to Premium or Pro tier
- The commission is calculated as: `(revenue - costs) * 50%`
- Commission records are created with status "pending"

### 4. Cost Tracking

To accurately calculate commissions, track costs using the API:

```bash
POST /api/affiliate/add-cost
{
  "subscription_id": "uuid",
  "cost_type": "payment_processing", // or "infrastructure", "support", etc.
  "amount": 0.50,
  "description": "PayPal processing fee",
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-31T23:59:59Z"
}
```

### 5. Payouts

Process payouts using the payout API:

```bash
POST /api/affiliate/payout
{
  "affiliate_id": "uuid",
  "commission_ids": ["uuid1", "uuid2", ...]
}
```

**Note**: The PayPal payout integration needs to be completed. Currently, it simulates payouts. To integrate:

1. Install PayPal SDK: `npm install @paypal/payouts-sdk`
2. Update `api/affiliate/payout.ts` with actual PayPal API calls
3. Add PayPal credentials to environment variables:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`

## API Endpoints

### Affiliate Registration
```
POST /api/affiliate/register
Authorization: Bearer <token>
```

### Get Dashboard Data
```
GET /api/affiliate/dashboard
Authorization: Bearer <token>
```

### Update PayPal Email
```
POST /api/affiliate/update-paypal
Authorization: Bearer <token>
Body: { "paypal_email": "email@example.com" }
```

### Track Referral (Internal)
```
POST /api/affiliate/track-referral
Body: { "referral_code": "AFF123", "user_id": "uuid" }
```

### Calculate Commission (Internal)
```
POST /api/affiliate/calculate-commission
Body: {
  "subscription_id": "uuid",
  "user_id": "uuid",
  "tier": "premium",
  "revenue": 9.99,
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-31T23:59:59Z"
}
```

### Get Marketing Materials
```
GET /api/affiliate/marketing-materials?type=banner
```

### Add Cost (Admin)
```
POST /api/affiliate/add-cost
Body: {
  "subscription_id": "uuid",
  "cost_type": "payment_processing",
  "amount": 0.50,
  "description": "PayPal fee"
}
```

### Process Payout (Admin)
```
POST /api/affiliate/payout
Body: {
  "affiliate_id": "uuid",
  "commission_ids": ["uuid1", "uuid2"]
}
```

## Frontend Usage

### Affiliate Service

```typescript
import { affiliateService } from '../services/affiliate';

// Register as affiliate
const { affiliate, error } = await affiliateService.register();

// Get dashboard data
const { affiliate, stats, recent_commissions, recent_referrals } = 
  await affiliateService.getDashboard();

// Generate affiliate link
const link = affiliateService.generateAffiliateLink('AFF123', '/pricing');

// Get referral code from URL
const code = affiliateService.getReferralCodeFromUrl();
```

### Affiliate Dashboard

Users can access their dashboard at `/affiliate`:
- View stats (earnings, referrals, conversions)
- Copy referral code and links
- View recent commissions and referrals
- Update PayPal email for payouts
- Access marketing materials

## Marketing Materials

Add marketing materials via SQL:

```sql
INSERT INTO marketing_materials (title, description, material_type, content, file_url, is_active)
VALUES (
  'Banner Ad 728x90',
  'Standard banner ad for websites',
  'banner',
  NULL,
  'https://yoursite.com/banners/banner-728x90.png',
  TRUE
);
```

Types: `banner`, `email_template`, `social_post`, `landing_page`, `other`

## Commission Calculation Example

Example: User subscribes to Premium ($9.99/month)

1. **Revenue**: $9.99
2. **Costs**: 
   - Payment processing: $0.50
   - Infrastructure: $1.00
   - Total: $1.50
3. **Profit**: $9.99 - $1.50 = $8.49
4. **Commission**: $8.49 * 50% = $4.25

The affiliate earns $4.25 for this subscription.

## Security Considerations

1. **RLS Policies**: Row Level Security is enabled on all tables
2. **Authentication**: All affiliate endpoints require authentication
3. **Admin Endpoints**: Payout and cost tracking should be admin-only (TODO: add admin checks)
4. **Referral Validation**: Invalid referral codes don't block signups

## Next Steps

1. ✅ Database schema created
2. ✅ API endpoints created
3. ✅ Frontend dashboard created
4. ✅ Referral tracking integrated
5. ⏳ Complete PayPal payout integration
6. ⏳ Add admin authentication to payout/cost endpoints
7. ⏳ Add email notifications for commissions
8. ⏳ Add affiliate approval workflow (optional)

## Testing

1. Register as affiliate: Visit `/affiliate` and register
2. Get referral code: Copy your referral code
3. Test referral link: Sign up with `?ref=YOUR_CODE` in URL
4. Create subscription: Subscribe to Premium/Pro
5. Check commission: View dashboard to see pending commission
6. Add costs: Use API to add costs
7. Process payout: Use payout API (currently simulated)

## Troubleshooting

### Commissions not calculating
- Check that referral was tracked (check `referrals` table)
- Verify subscription was created successfully
- Check API logs for commission calculation errors

### Referrals not tracking
- Ensure referral code is in URL (`?ref=CODE`)
- Check that affiliate exists and is active
- Verify signup flow calls `trackReferral`

### Dashboard not loading
- Check user authentication
- Verify affiliate record exists for user
- Check API endpoint responses

## Support

For issues or questions, contact support or check the admin dashboard for affiliate management tools.
