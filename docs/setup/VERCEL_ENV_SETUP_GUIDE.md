# Step-by-Step Guide: Setting Environment Variables in Vercel Dashboard

## Quick Access
**Direct Link**: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

## Step-by-Step Instructions

### Step 1: Navigate to Environment Variables
1. Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds
2. Click on **"Settings"** in the top navigation
3. Click on **"Environment Variables"** in the left sidebar

### Step 2: Add First Variable (VITE_SUPABASE_URL)

1. Click the **"Add New"** button (usually top-right)
2. Fill in the form:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: `https://nonaqhllakrckbtbawrb.supabase.co`
   - **Environment**: Select all three checkboxes:
     - ☑ Production
     - ☑ Preview  
     - ☑ Development
3. Click **"Save"**

### Step 3: Add Second Variable (VITE_SUPABASE_ANON_KEY)

1. Click **"Add New"** again
2. Fill in the form:
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_MTJcNT_tm_odoawn6LxYJQ_rHVkY5uh`
   - **Environment**: Select all three checkboxes:
     - ☑ Production
     - ☑ Preview
     - ☑ Development
   - **Note**: You may want to check "Encrypt" or mark as sensitive (optional)
3. Click **"Save"**

### Step 4: Verify Variables Are Set

You should now see both variables in the list:
- ✅ `VITE_SUPABASE_URL` (Production, Preview, Development)
- ✅ `VITE_SUPABASE_ANON_KEY` (Production, Preview, Development)

### Step 5: Redeploy Your Project

**Option A: Automatic Redeploy**
- Vercel will automatically redeploy when you save environment variables
- Check the "Deployments" tab to see the new deployment

**Option B: Manual Redeploy**
1. Go to the **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a deployment

### Step 6: Verify It Works

1. Wait for the deployment to complete (usually 1-2 minutes)
2. Visit your production site
3. Open browser console (F12)
4. You should see: `✅ SCOT33 CLASSIC Error monitoring system initialized`
5. No Supabase credential errors should appear

## Troubleshooting

### Variables Not Showing Up?
- Make sure you selected all environments (Production, Preview, Development)
- Refresh the page and check again

### Still Getting Errors?
- Wait a few minutes for the deployment to complete
- Clear your browser cache
- Check the deployment logs in Vercel

### Need to Update a Variable?
- Click on the variable name in the list
- Click "Edit"
- Update the value
- Save (will trigger a new deployment)

## Quick Copy-Paste Values

**Variable 1:**
```
Key: VITE_SUPABASE_URL
Value: https://nonaqhllakrckbtbawrb.supabase.co
```

**Variable 2:**
```
Key: VITE_SUPABASE_ANON_KEY
Value: sb_publishable_MTJcNT_tm_odoawn6LxYJQ_rHVkY5uh
```

## Visual Guide

```
Vercel Dashboard
├── Settings (click)
│   ├── Environment Variables (click)
│   │   ├── Add New (button)
│   │   │   ├── Key: [paste key]
│   │   │   ├── Value: [paste value]
│   │   │   ├── ☑ Production
│   │   │   ├── ☑ Preview
│   │   │   ├── ☑ Development
│   │   │   └── Save (button)
│   │   └── [Repeat for second variable]
│   └── Deployments (check after saving)
```

## Need Help?

If you're stuck, you can also:
1. Run the dashboard script again: `./set-vercel-env-dashboard.sh`
2. Check Vercel docs: https://vercel.com/docs/projects/environment-variables

