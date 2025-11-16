# Affiliate Program Setup Guide

## Overview

The affiliate program allows users to earn commissions by referring customers to your platform. This guide will help you set up and manage the affiliate system.

## ✅ Current Status

- ✅ **Database Schema**: `affiliates` and `affiliate_commissions` tables defined
- ✅ **Admin Component**: `AffiliateManagement.tsx` component exists
- ✅ **Admin Dashboard**: Accessible at `/admin` → "Affiliates" tab
- ⚠️ **Database Setup**: Tables need to be created in Supabase
- ⚠️ **Frontend Integration**: Affiliate links/tracking needs implementation

## 📋 Setup Steps

### Step 1: Create Database Tables

Run the affiliate tables SQL in your Supabase SQL Editor:

```sql
-- Affiliates Table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliate Commissions Table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own affiliate data
CREATE POLICY "Users can read their own affiliate data"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage affiliates
CREATE POLICY "Admins can manage affiliates"
  ON affiliates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Affiliates can read their own commissions
CREATE POLICY "Affiliates can read their own commissions"
  ON affiliate_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = affiliate_commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

-- Admins can manage affiliate commissions
CREATE POLICY "Admins can manage affiliate commissions"
  ON affiliate_commissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
```

**Or use the complete schema:**
Run `admin-dashboard-schema.sql` which includes all affiliate tables and policies.

### Step 2: Access Admin Dashboard

1. **Log in as admin** at `http://localhost:3000`
2. **Navigate to** `/admin`
3. **Click "Affiliates" tab** in the sidebar

### Step 3: Create Your First Affiliate

1. In the Admin Dashboard → Affiliates tab
2. Click **"New Affiliate"** button
3. Fill in:
   - **User ID**: The UUID of the user who will be the affiliate
   - **Affiliate Code**: Unique code (e.g., `AFF123`) or leave blank to auto-generate
   - **Commission Rate**: Percentage (default: 10%)
   - **Status**: `active`, `inactive`, or `suspended`
4. Click **"Create Affiliate"**

### Step 4: Generate Affiliate Links

Affiliate links should follow this format:
```
https://thelostandunfounds.com/?ref=AFF123
```

Or for specific pages:
```
https://thelostandunfounds.com/shop?ref=AFF123
https://thelostandunfounds.com/pricing?ref=AFF123
```

### Step 5: Track Clicks (Implementation Needed)

You'll need to add click tracking when users visit with `?ref=` parameter:

```typescript
// Example: In your app initialization or router
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Store in cookie/localStorage
    localStorage.setItem('affiliate_ref', refCode);
    
    // Track click in database
    trackAffiliateClick(refCode);
  }
}, []);
```

### Step 6: Track Conversions (Implementation Needed)

When a purchase is made, check for affiliate code and create commission:

```typescript
async function handlePurchase(orderId: string, amount: number) {
  const refCode = localStorage.getItem('affiliate_ref');
  
  if (refCode) {
    // Find affiliate by code
    const affiliate = await getAffiliateByCode(refCode);
    
    if (affiliate && affiliate.status === 'active') {
      // Calculate commission
      const commission = amount * (affiliate.commission_rate / 100);
      
      // Create commission record
      await createAffiliateCommission({
        affiliate_id: affiliate.id,
        order_id: orderId,
        amount: commission,
        status: 'pending'
      });
      
      // Update affiliate stats
      await updateAffiliateStats(affiliate.id, {
        total_conversions: affiliate.total_conversions + 1,
        total_earnings: affiliate.total_earnings + commission
      });
    }
  }
}
```

## 🎯 Features

### Admin Dashboard Features

- ✅ **Create Affiliates**: Add new affiliate accounts
- ✅ **Edit Affiliates**: Update commission rates and status
- ✅ **Delete Affiliates**: Remove affiliate accounts
- ✅ **View Statistics**: See total earnings, clicks, conversions
- ✅ **Commission Tracking**: View all commission records
- ✅ **Status Management**: Activate, deactivate, or suspend affiliates

### Affiliate Features (To Be Implemented)

- ⚠️ **Affiliate Dashboard**: View own stats and earnings
- ⚠️ **Generate Links**: Create custom affiliate links
- ⚠️ **Commission History**: View payment history
- ⚠️ **Payout Requests**: Request commission payouts

## 📊 Database Schema

### `affiliates` Table
- `id`: UUID primary key
- `user_id`: Reference to auth.users
- `code`: Unique affiliate code
- `commission_rate`: Percentage (0-100)
- `status`: `active`, `inactive`, or `suspended`
- `total_earnings`: Cumulative earnings
- `total_clicks`: Total link clicks
- `total_conversions`: Total successful conversions

### `affiliate_commissions` Table
- `id`: UUID primary key
- `affiliate_id`: Reference to affiliates table
- `order_id`: Reference to order/purchase
- `amount`: Commission amount
- `status`: `pending`, `paid`, or `cancelled`
- `created_at`: Timestamp

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all tables
- **User Access**: Users can only see their own affiliate data
- **Admin Access**: Admins can manage all affiliates
- **Commission Privacy**: Affiliates can only see their own commissions

## 🚀 Next Steps

1. ✅ **Database Setup**: Run the SQL schema (Step 1)
2. ✅ **Test Admin Dashboard**: Create a test affiliate
3. ⚠️ **Implement Click Tracking**: Add ref parameter tracking
4. ⚠️ **Implement Conversion Tracking**: Track purchases with affiliate codes
5. ⚠️ **Create Affiliate Portal**: Let affiliates view their own stats
6. ⚠️ **Add Payout System**: Implement commission payment processing

## 📝 Notes

- Default commission rate is 10%
- Affiliate codes are auto-generated if not provided
- Commissions are created as `pending` and must be manually marked as `paid`
- Click tracking requires frontend implementation
- Conversion tracking requires integration with payment/order system

## 🐛 Troubleshooting

**Can't see Affiliates tab?**
- Make sure you're logged in as an admin user
- Check that `user_profiles` table has `is_admin = true` for your user

**Affiliate creation fails?**
- Verify the `user_id` exists in `auth.users`
- Check that the affiliate code is unique
- Ensure commission rate is between 0-100

**Commissions not tracking?**
- Verify click tracking is implemented
- Check that conversion tracking is called on purchases
- Ensure affiliate status is `active`

