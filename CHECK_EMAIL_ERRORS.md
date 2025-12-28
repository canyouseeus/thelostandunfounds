# How to Check Email Sending Errors

## Step 1: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Functions** tab
4. Click on `api/newsletter-subscribe`
5. Look at the **Logs** section (not just the request list)
6. Look for lines that say:
   - "Failed to send confirmation email"
   - "Zoho token refresh failed"
   - "Zoho email API error"
   - "No account ID available"

## Step 2: Test Zoho Configuration

After deployment completes (~1 minute), visit:
**https://www.thelostandunfounds.com/api/test-email-config?token=reset-newsletter-2024**

This will show you:
- Which Zoho credentials are set
- If token refresh works
- If account ID can be retrieved

## Step 3: Check Browser Response

When you sign up, open browser DevTools (F12):
1. Go to **Network** tab
2. Sign up again
3. Click on the `newsletter-subscribe` request
4. Check the **Response** tab
5. Look for a `warning` field - this will show the email error

## Common Issues:

1. **Missing Zoho credentials** - Check Vercel Environment Variables
2. **Expired refresh token** - Need to regenerate Zoho refresh token
3. **Wrong account ID** - Zoho API returning wrong format
4. **Zoho API permissions** - Account might not have email sending permissions
