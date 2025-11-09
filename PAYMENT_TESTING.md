# Payment Testing Guide

This guide explains how to test the payment functionality in the TikTok Downloader application.

## Overview

The application supports three payment methods:
1. **PayPal** (including Apple Pay through PayPal SDK)
2. **Google Pay**
3. **Direct PayPal Checkout** (redirect flow)

## Payment Flow

The payment process follows these steps:

1. **Create Payment** (`POST /api/tiktok/payments/create`)
   - Creates a PayPal order
   - Returns `orderId` or `approvalUrl` depending on payment method

2. **Execute Payment** (`POST /api/tiktok/payments/execute`)
   - Captures/completes the payment
   - Upgrades user to premium tier

## Prerequisites

### Backend API Endpoints

Ensure these endpoints are available and configured:

- `GET /api/tiktok/payments/paypal-config` - Returns PayPal configuration
- `POST /api/tiktok/payments/create` - Creates a payment order
- `POST /api/tiktok/payments/execute` - Executes/captures the payment

### Environment Configuration

The backend needs to be configured with:

- **PayPal Sandbox Credentials** (for testing):
  - `PAYPAL_CLIENT_ID` - PayPal sandbox client ID
  - `PAYPAL_CLIENT_SECRET` - PayPal sandbox client secret
  - `PAYPAL_MERCHANT_ID` - PayPal merchant ID (for Google Pay)
  - `PAYPAL_ENVIRONMENT=sandbox` - Use sandbox for testing

## Testing PayPal Payments

### 1. PayPal Sandbox Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Create a sandbox account or use existing one
3. Create a sandbox app to get Client ID and Secret
4. Configure your backend with sandbox credentials

### 2. Test PayPal Checkout Flow

**Steps:**
1. Navigate to the TikTok Downloader page
2. Log in with a test account
3. Click "UPGRADE TO PREMIUM ($4.99/MO)" button
4. You should be redirected to PayPal sandbox checkout
5. Use PayPal sandbox test account credentials:
   - **Buyer Account**: Use a sandbox personal account
   - **Test Email**: `buyer@personal.example.com` (or your sandbox account)
   - **Password**: Set in PayPal sandbox dashboard

**Expected Behavior:**
- Payment creation succeeds
- Redirect to PayPal approval URL
- After approval, redirect back to app
- User upgraded to premium tier
- Download limit removed

### 3. Test PayPal Sandbox Accounts

PayPal provides test accounts in the sandbox dashboard. Use these for testing:

**Personal Account (Buyer):**
- Email: `buyer@personal.example.com`
- Password: Set in PayPal dashboard
- Use this to test payment approval

**Business Account (Merchant):**
- Email: `merchant@business.example.com`
- Password: Set in PayPal dashboard
- This represents your app's PayPal account

### 4. Test Cards for PayPal

PayPal sandbox accepts these test card numbers:

**Visa:**
- Card: `4111111111111111`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

**Mastercard:**
- Card: `5555555555554444`
- Expiry: Any future date
- CVV: Any 3 digits

**Note:** Use these cards when PayPal prompts for card payment instead of PayPal account.

## Testing Apple Pay (via PayPal SDK)

### Prerequisites

- **Safari browser** (Apple Pay only works in Safari on macOS/iOS)
- **macOS device** with Touch ID/Face ID or **iOS device**
- Apple Pay configured with a test card

### Test Steps

1. Open the app in Safari on macOS or iOS
2. Log in with a test account
3. The Apple Pay button should appear in the upgrade banner
4. Click the Apple Pay button
5. Authenticate with Touch ID/Face ID or passcode
6. Confirm payment

**Expected Behavior:**
- Apple Pay button appears (only in Safari)
- Payment sheet opens
- Payment processes through PayPal
- User upgraded to premium

### Apple Pay Test Cards

Add these test cards to Wallet app for testing:

1. Open Wallet app
2. Add a card
3. Use test card numbers:
   - **Visa**: `4111111111111111`
   - **Mastercard**: `5555555555554444`
   - Expiry: Future date
   - CVV: Any 3 digits

**Note:** Apple Pay in sandbox mode may require special configuration. Check PayPal documentation for Apple Pay sandbox setup.

## Testing Google Pay

### Prerequisites

- **Chrome browser** (Google Pay works best in Chrome)
- Google account with payment method added
- Backend configured with PayPal merchant ID

### Test Steps

1. Open the app in Chrome browser
2. Log in with a test account
3. The Google Pay button should appear in the upgrade banner
4. Click the Google Pay button
5. Select a payment method
6. Complete authentication
7. Confirm payment

**Expected Behavior:**
- Google Pay button appears
- Payment sheet opens
- Payment processes through PayPal
- User upgraded to premium

### Google Pay Test Setup

1. Add a test card to your Google account:
   - Go to [pay.google.com](https://pay.google.com)
   - Add a payment method
   - Use test card numbers (same as PayPal test cards)

2. For sandbox testing:
   - Ensure backend sets `PAYPAL_ENVIRONMENT=sandbox`
   - Google Pay will use TEST environment automatically

## Testing Scenarios

### Scenario 1: Successful Payment

**Steps:**
1. Log in as free tier user
2. Click upgrade button
3. Complete payment flow
4. Verify premium status

**Expected:**
- ✅ Payment succeeds
- ✅ User upgraded to premium
- ✅ Download limit removed
- ✅ Upgrade banner hidden

### Scenario 2: Payment Cancellation

**Steps:**
1. Start payment flow
2. Cancel at PayPal checkout
3. Return to app

**Expected:**
- ✅ Payment cancelled message shown
- ✅ User remains on free tier
- ✅ Upgrade banner still visible

### Scenario 3: Payment Error

**Steps:**
1. Simulate backend error (disable endpoint)
2. Attempt payment

**Expected:**
- ✅ Error message displayed
- ✅ User remains on free tier
- ✅ Can retry payment

### Scenario 4: Unauthenticated User

**Steps:**
1. Log out
2. Click upgrade button

**Expected:**
- ✅ Login prompt shown
- ✅ Cannot proceed without login

### Scenario 5: Premium User

**Steps:**
1. Log in as premium user
2. Check upgrade banner

**Expected:**
- ✅ Upgrade banner hidden
- ✅ No payment buttons shown
- ✅ Unlimited downloads

## Testing Payment Endpoints Directly

### Test Payment Creation

```bash
# Create a payment order
curl -X POST https://your-domain.com/api/tiktok/payments/create \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "plan": "premium",
    "billingCycle": "monthly"
  }'
```

**Expected Response:**
```json
{
  "orderId": "5O190127TN364715T",
  "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=..."
}
```

### Test Payment Execution

```bash
# Execute/capture payment
curl -X POST https://your-domain.com/api/tiktok/payments/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "orderId": "5O190127TN364715T"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "orderId": "5O190127TN364715T"
}
```

### Test PayPal Config

```bash
# Get PayPal configuration
curl https://your-domain.com/api/tiktok/payments/paypal-config \
  -H "Cookie: your-session-cookie"
```

**Expected Response:**
```json
{
  "clientId": "your-paypal-client-id",
  "merchantId": "your-paypal-merchant-id",
  "environment": "sandbox"
}
```

## Debugging Tips

### Browser Console

Check browser console for:
- Payment creation errors
- PayPal SDK loading issues
- API endpoint errors
- Network request failures

### Common Issues

1. **PayPal SDK not loading**
   - Check network tab for SDK script loading
   - Verify PayPal client ID is configured
   - Check CORS settings

2. **Payment buttons not appearing**
   - Verify user is logged in
   - Check upgrade banner visibility
   - Verify payment SDKs loaded successfully

3. **Payment fails**
   - Check backend logs
   - Verify PayPal credentials
   - Check order ID validity
   - Verify user authentication

4. **Google Pay not available**
   - Check browser compatibility (Chrome recommended)
   - Verify PayPal merchant ID configured
   - Check Google Pay SDK loading

5. **Apple Pay not available**
   - Must use Safari browser
   - Requires macOS/iOS device
   - Check Apple Pay configuration

## Test Checklist

- [ ] PayPal checkout flow works
- [ ] PayPal sandbox test account works
- [ ] Payment cancellation handled correctly
- [ ] Payment errors handled gracefully
- [ ] Apple Pay button appears (Safari only)
- [ ] Apple Pay flow works (macOS/iOS)
- [ ] Google Pay button appears (Chrome)
- [ ] Google Pay flow works
- [ ] User upgraded to premium after payment
- [ ] Download limit removed for premium users
- [ ] Upgrade banner hidden for premium users
- [ ] Unauthenticated users prompted to login
- [ ] Payment endpoints return correct responses
- [ ] Error messages are user-friendly

## Production Testing

Before going live:

1. **Switch to Production**
   - Update `PAYPAL_ENVIRONMENT=live` in backend
   - Use production PayPal credentials
   - Test with real PayPal account (small amount)

2. **Verify SSL**
   - Ensure HTTPS is enabled
   - Required for payment processing

3. **Test Payment Methods**
   - Test all three payment methods
   - Verify webhook handling (if implemented)
   - Test refund flow (if implemented)

4. **Monitor**
   - Set up error logging
   - Monitor payment success rates
   - Track failed payments

## Additional Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Sandbox Testing Guide](https://developer.paypal.com/docs/api-basics/sandbox/)
- [Google Pay Integration Guide](https://developers.google.com/pay/api/web/overview)
- [Apple Pay Integration Guide](https://developer.apple.com/apple-pay/)
