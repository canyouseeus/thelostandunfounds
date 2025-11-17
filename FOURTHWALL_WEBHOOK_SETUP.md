# Fourthwall Webhook Setup Guide

This guide walks you through setting up webhooks from Fourthwall to track orders and create affiliate commissions automatically.

## 🎯 Overview

When a customer completes an order on your Fourthwall store, Fourthwall will send a webhook notification to your server. This allows you to:
- Automatically create affiliate commissions
- Track profit and update KING MIDAS stats
- Process orders without manual intervention

## 📋 Prerequisites

1. **Fourthwall Store**: Your store must be set up and active
2. **Vercel Deployment**: Your site must be deployed to Vercel (webhook needs a public URL)
3. **Admin Access**: You need access to both Fourthwall dashboard and Vercel dashboard

## 🚀 Step-by-Step Setup

### Step 1: Get Your Webhook URL

Your webhook endpoint is:
```
https://thelostandunfounds.com/api/webhooks/fourthwall
```

**Note**: Make sure your site is deployed to Vercel and accessible at this URL.

### Step 2: Configure Webhook in Fourthwall Dashboard

1. **Log in to Fourthwall**
   - Go to: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard
   - Sign in with your Fourthwall account

2. **Navigate to Webhook Settings**
   - In the left sidebar, look for **"Settings"** or **"Integrations"**
   - Click on **"Webhooks"** or **"API"** or **"Developer Settings"**
   - If you can't find it, try: https://thelostandunfounds-shop.fourthwall.com/admin/dashboard/settings/for-developers

3. **Add New Webhook**
   - Click **"Add Webhook"** or **"Create Webhook"** button
   - Fill in the webhook form:
     - **Webhook URL**: `https://thelostandunfounds.com/api/webhooks/fourthwall`
     - **Events to Subscribe**: Select these events:
       - ✅ `order.created` - When a new order is placed
       - ✅ `order.fulfilled` - When an order is fulfilled
       - ✅ `order.cancelled` - When an order is cancelled
     - **Webhook Secret** (if available): Generate or copy a secret key
       - **Save this secret** - you'll need it for Step 3

4. **Save Webhook**
   - Click **"Save"** or **"Create"**
   - Fourthwall may send a test webhook to verify the URL works

### Step 3: Add Webhook Secret to Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Link: https://vercel.com/joshua-greenes-projects/thelostandunfounds
   - Or navigate: Vercel Dashboard → Your Project → Settings

2. **Open Environment Variables**
   - Click on **"Settings"** tab
   - Click on **"Environment Variables"** in the left sidebar
   - Or go directly: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

3. **Add Webhook Secret**
   - Click **"Add New"** button
   - Fill in:
     - **Key**: `FOURTHWALL_WEBHOOK_SECRET`
     - **Value**: Paste the webhook secret from Step 2 (or generate a random string if Fourthwall doesn't provide one)
     - **Environments**: Select all (Production, Preview, Development)
   - Click **"Save"**

4. **Redeploy** (if needed)
   - Vercel will automatically redeploy, or you can manually trigger:
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment

### Step 4: Test the Webhook

1. **Place a Test Order**
   - Go to your Fourthwall store
   - Add a product to cart
   - Complete checkout (use test mode if available)

2. **Check Webhook Logs**
   - In Vercel Dashboard, go to **"Functions"** tab
   - Click on `/api/webhooks/fourthwall`
   - Check the **"Logs"** section for webhook activity
   - You should see logs showing the webhook was received

3. **Verify Commission Created**
   - Go to your admin dashboard: `/admin`
   - Navigate to **"Affiliates"** tab
   - Check **"Recent Commissions"** section
   - You should see a new commission if the order had an affiliate reference

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Problem**: Webhooks aren't being received

**Solutions**:
1. **Verify URL is correct**
   - Check that the webhook URL in Fourthwall matches exactly: `https://thelostandunfounds.com/api/webhooks/fourthwall`
   - Make sure there's no trailing slash

2. **Check Vercel Deployment**
   - Ensure your site is deployed and accessible
   - Check Vercel function logs for errors

3. **Verify Webhook Secret**
   - Make sure `FOURTHWALL_WEBHOOK_SECRET` is set in Vercel
   - Check that it matches what's configured in Fourthwall (if applicable)

4. **Check Fourthwall Webhook Status**
   - In Fourthwall dashboard, check webhook status
   - Look for any error messages or failed delivery attempts

### Commissions Not Being Created

**Problem**: Webhooks are received but commissions aren't created

**Solutions**:
1. **Check Order Has Affiliate Reference**
   - The order must have an `affiliate_ref` or `ref` parameter
   - This is added automatically when customers click affiliate links

2. **Verify Affiliate Code Exists**
   - Check that the affiliate code in the order matches an active affiliate in your database
   - Go to `/admin` → **"Affiliates"** tab to verify

3. **Check Product Costs**
   - Product costs must be set up for profit calculation
   - Go to `/admin` → **"Product Costs"** to add costs

4. **Check Vercel Function Logs**
   - Look for errors in the webhook handler
   - Check for database connection issues

### Webhook Signature Verification Failing

**Problem**: Webhook returns 401 Unauthorized

**Solutions**:
1. **Check Webhook Secret**
   - Verify `FOURTHWALL_WEBHOOK_SECRET` is set correctly in Vercel
   - Make sure there are no extra spaces or characters

2. **Verify Signature Header**
   - Check what header name Fourthwall uses for signatures
   - Common names: `X-Fourthwall-Signature`, `X-Webhook-Signature`, `X-Signature`
   - Update the webhook handler code if needed

## 📚 Additional Resources

- **Fourthwall API Docs**: https://docs.fourthwall.com/
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Webhook Endpoint Code**: `/api/webhooks/fourthwall.ts`

## ✅ Verification Checklist

- [ ] Webhook URL configured in Fourthwall dashboard
- [ ] Webhook events selected (order.created, order.fulfilled, order.cancelled)
- [ ] `FOURTHWALL_WEBHOOK_SECRET` added to Vercel environment variables
- [ ] Site redeployed after adding environment variable
- [ ] Test order placed successfully
- [ ] Webhook received (check Vercel function logs)
- [ ] Commission created in admin dashboard (if order had affiliate ref)

## 🔐 Security Notes

- **Webhook Secret**: This is used to verify webhooks are actually from Fourthwall
- **Keep Secret Safe**: Don't commit the webhook secret to git
- **HTTPS Only**: Webhooks only work over HTTPS (production URLs)
- **Signature Verification**: The webhook handler verifies signatures when `FOURTHWALL_WEBHOOK_SECRET` is set

## 📞 Need Help?

If you encounter issues:
1. Check Vercel function logs for error messages
2. Verify all environment variables are set correctly
3. Test the webhook endpoint manually with a POST request
4. Check Fourthwall webhook delivery status in their dashboard

