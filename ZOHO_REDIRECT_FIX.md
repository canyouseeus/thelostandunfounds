# Fix Zoho Redirect URI

## Problem
Zoho redirected to homepage instead of capturing the authorization code.

## Solution

### Step 1: Update Zoho App Redirect URI

1. Go back to: https://api-console.zoho.com/
2. Click on your app (the one you just created)
3. Find "Authorized Redirect URIs"
4. **Change** `https://thelostandunfounds.com/auth/callback` 
5. **To**: `https://www.thelostandunfounds.com/zoho/callback`
6. Click "Save" or "Update"

### Step 2: Re-authorize (Get New Code)

After updating the redirect URI, authorize again:

1. **Build this URL** (replace YOUR_CLIENT_ID):
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.organization.READ&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://www.thelostandunfounds.com/zoho/callback&access_type=offline
   ```

2. **Open the URL** in your browser
3. **Authorize** the app
4. **You'll be redirected to**: `https://www.thelostandunfounds.com/zoho/callback?code=AUTHORIZATION_CODE`
5. **The page will show** the authorization code and copy it automatically

### Step 3: Exchange Code for Refresh Token

Once you have the code, run:
```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
./get-refresh-token.sh YOUR_CLIENT_ID YOUR_CLIENT_SECRET AUTHORIZATION_CODE
```

---

## Quick Authorization URL Generator

Replace `YOUR_CLIENT_ID` with your actual Client ID:

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.organization.READ&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://www.thelostandunfounds.com/zoho/callback&access_type=offline
```

