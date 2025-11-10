# How to Add Environment Variables to Vercel

## Step-by-Step Guide

### 1. Go to Your Vercel Project

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`thelostandunfounds` or similar)

### 2. Navigate to Settings

1. Click on the **"Settings"** tab (at the top of the project page)
2. In the left sidebar, click **"Environment Variables"**

### 3. Add Each Variable

Click **"Add New"** and add these 3 variables one by one:

#### Variable 1: ZOHO_API_KEY
- **Key:** `ZOHO_API_KEY`
- **Value:** (paste your Zoho OAuth token here)
- **Environment:** Select all (Production, Preview, Development)
- Click **"Save"**

#### Variable 2: ZOHO_LIST_KEY
- **Key:** `ZOHO_LIST_KEY`
- **Value:** (paste your Zoho Campaigns list key here)
- **Environment:** Select all (Production, Preview, Development)
- Click **"Save"**

#### Variable 3: ZOHO_API_URL (Optional)
- **Key:** `ZOHO_API_URL`
- **Value:** `https://campaigns.zoho.com/api/v1.1/json/listsubscribe`
- **Environment:** Select all (Production, Preview, Development)
- Click **"Save"**

### 4. Redeploy Your Site

After adding all variables:
1. Go to the **"Deployments"** tab
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger auto-deploy

## Visual Guide

```
Vercel Dashboard
  └── Your Project
      └── Settings (tab at top)
          └── Environment Variables (left sidebar)
              └── Add New (button)
                  └── Enter Key and Value
                      └── Select Environments
                          └── Save
```

## Important Notes

- **Don't add quotes** around the values - just paste them directly
- **Select all environments** (Production, Preview, Development) so it works everywhere
- **Redeploy after adding** - Environment variables only take effect after redeployment
- **Keep keys secret** - Never commit these to git or share them publicly

## Quick Checklist

- [ ] Added `ZOHO_API_KEY`
- [ ] Added `ZOHO_LIST_KEY`
- [ ] Added `ZOHO_API_URL` (optional, has default)
- [ ] Selected all environments for each variable
- [ ] Redeployed the site
