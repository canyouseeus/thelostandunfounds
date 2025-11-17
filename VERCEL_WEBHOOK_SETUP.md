# Vercel Deployment Webhook Setup Guide

This guide explains how to set up automated alerts for Vercel deployment failures.

## 🎯 Overview

When a Vercel deployment fails, you'll automatically receive notifications via:
- **Telegram** (if configured)
- **Console logs** (always)

## 🚀 Quick Setup

### Step 1: Configure Webhook in Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Link: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/integrations
   - Or navigate: Vercel Dashboard → Your Project → Settings → Integrations

2. **Create Webhook**
   - Click **"Create Webhook"** or **"Add Webhook"**
   - Fill in the webhook form:
     - **Name**: `Deployment Alerts`
     - **Webhook URL**: `https://thelostandunfounds.com/api/webhooks/vercel`
     - **Events**: Select these events:
       - ✅ `deployment.created` - When deployment starts
       - ✅ `deployment.succeeded` - When deployment succeeds
       - ✅ `deployment.error` - **When deployment fails** ⚠️
       - ✅ `deployment.ready` - When deployment is ready
       - ✅ `deployment.canceled` - When deployment is canceled

3. **Save Webhook**
   - Click **"Save"** or **"Create"**
   - Vercel will send a test webhook to verify the URL works

### Step 2: (Optional) Set Webhook Secret

For additional security, you can set a webhook secret:

1. **Generate a Secret**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Vercel Environment Variables**
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - Add:
     - **Key**: `VERCEL_WEBHOOK_SECRET`
     - **Value**: Your generated secret
     - **Environments**: All (Production, Preview, Development)

3. **Add Secret to Webhook Configuration**
   - Go back to webhook settings
   - Add the secret in the webhook configuration

### Step 3: (Optional) Configure Telegram Notifications

If you want Telegram notifications:

1. **Set Telegram Environment Variables**
   - Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables
   - Ensure these are set:
     - `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
     - `TELEGRAM_ALLOWED_USER_IDS` - Comma-separated user IDs (e.g., `123456789,987654321`)

2. **Get Your Telegram User ID**
   - Send a message to your bot
   - Check the webhook logs or use: https://api.telegram.org/bot<TOKEN>/getUpdates

3. **Redeploy** (if needed)
   - Vercel will automatically redeploy, or manually trigger:
   - Go to **"Deployments"** tab → Click **"Redeploy"**

## 📋 Webhook Events

The webhook handler processes these events:

| Event | Description | Notification |
|-------|-------------|--------------|
| `deployment.created` | Deployment started | Info |
| `deployment.succeeded` | Deployment succeeded | Success |
| `deployment.error` | **Deployment failed** | **Error** ⚠️ |
| `deployment.ready` | Deployment ready | Success |
| `deployment.canceled` | Deployment canceled | Warning |

## 🔍 Testing the Webhook

### Test 1: Check Webhook Endpoint

```bash
curl -X POST https://thelostandunfounds.com/api/webhooks/vercel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deployment.error",
    "payload": {
      "deployment": {
        "id": "test-123",
        "url": "test.vercel.app",
        "name": "test",
        "state": "ERROR",
        "project": {
          "name": "thelostandunfounds"
        }
      },
      "error": {
        "code": "BUILD_ERROR",
        "message": "Test error message"
      }
    }
  }'
```

### Test 2: Trigger a Deployment

1. Make a small change to your code
2. Push to GitHub (or trigger deployment)
3. Check Telegram or console logs for notification

## 📊 Notification Format

### Success Notification
```
✅ Deployment Succeeded

Project: thelostandunfounds
URL: https://thelostandunfounds.com
Target: production
Branch: main

Deployment ID: dpl_xxx
```

### Failure Notification
```
❌ Deployment Failed

Project: thelostandunfounds
Target: production
Branch: main
Author: Your Name
Error Code: BUILD_ERROR
Error: Build failed: npm run build exited with code 1

View Logs: https://vercel.com/joshua-greenes-projects/thelostandunfounds/dpl_xxx

Deployment ID: dpl_xxx
```

## 🐛 Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook Configuration**
   - Verify webhook URL is correct
   - Ensure events are selected
   - Check webhook is enabled

2. **Check Function Logs**
   - Go to: Vercel Dashboard → Functions → `/api/webhooks/vercel`
   - Check for errors or logs

3. **Test Webhook Endpoint**
   ```bash
   curl -X POST https://thelostandunfounds.com/api/webhooks/vercel \
     -H "Content-Type: application/json" \
     -d '{"type": "test"}'
   ```

### Telegram Notifications Not Working

1. **Check Environment Variables**
   - Verify `TELEGRAM_BOT_TOKEN` is set
   - Verify `TELEGRAM_ALLOWED_USER_IDS` is set
   - Check user IDs are correct

2. **Test Telegram Bot**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   ```

3. **Check Console Logs**
   - If Telegram fails, notifications will fall back to console logs
   - Check Vercel function logs for errors

### Webhook Returns 405 Error

- Ensure webhook is configured for POST requests
- Check webhook URL is correct: `/api/webhooks/vercel`

## 🔐 Security

- **Webhook Secret**: Optional but recommended for production
- **Telegram User IDs**: Restrict notifications to authorized users
- **HTTPS Only**: Webhook URL must use HTTPS (Vercel enforces this)

## 📝 API Reference

### Webhook Endpoint

**URL**: `/api/webhooks/vercel`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Body

```typescript
{
  id: string
  type: 'deployment.created' | 'deployment.succeeded' | 'deployment.error' | 'deployment.ready' | 'deployment.canceled'
  createdAt: number
  payload: {
    deployment?: {
      id: string
      url: string
      name: string
      state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'QUEUED'
      meta?: {
        githubCommitAuthorName?: string
        githubCommitMessage?: string
        githubCommitRef?: string
        githubCommitSha?: string
      }
      target?: 'production' | 'staging' | null
      project?: {
        id: string
        name: string
      }
    }
    error?: {
      code: string
      message: string
    }
  }
}
```

### Response

```json
{
  "received": true
}
```

## 🎉 Next Steps

After setup:
1. ✅ Webhook will automatically alert on deployment failures
2. ✅ Check Telegram or console logs for notifications
3. ✅ View detailed logs in Vercel dashboard

## 📚 Related Documentation

- [Vercel Webhooks Documentation](https://vercel.com/docs/observability/webhooks)
- [Telegram Setup Guide](./TELEGRAM_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)

