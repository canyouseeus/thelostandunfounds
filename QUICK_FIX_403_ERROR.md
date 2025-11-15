# 🔴 Quick Fix: Google OAuth 403 Error

## The Error You're Seeing

```
Failed to load resource: the server responded with a status of 403
accounts.google.com/AccountChooser?oauth=1&continue=...
```

This means **Google is blocking your OAuth request**. Follow these steps **in order**:

---

## ✅ Step 1: Publish OAuth Consent Screen (MOST IMPORTANT!)

**This is the #1 cause of 403 errors!**

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/apis/credentials/consent
   - Make sure you're in the **"THE LOST AND UNFOUNDS"** project

2. **Check Publishing Status**
   - Look at the top of the page
   - If it says **"Testing"** → **YOU MUST PUBLISH IT**
   - If it says **"In production"** → Skip to Step 2

3. **Publish the App**:
   - Click the **"PUBLISH APP"** button (big blue button at the top)
   - Confirm the warning dialog
   - **Wait 2-5 minutes** for changes to propagate

**⚠️ 90% of 403 errors are fixed by publishing the consent screen!**

---

## ✅ Step 2: Verify Redirect URI in Google Cloud Console

1. **Go to Credentials**
   - https://console.cloud.google.com/apis/credentials
   - Click on your OAuth 2.0 Client ID (`817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt`)

2. **Check "Authorized redirect URIs"**
   - You MUST have this **exact** URI:
     ```
     https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback
     ```
   - **No trailing slash**, **exact match**

3. **If Missing**:
   - Click **"+ ADD URI"**
   - Paste: `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback`
   - Click **"SAVE"**

---

## ✅ Step 3: Update Supabase Redirect URLs

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select project: **nonaqhllakrckbtbawrb**

2. **Go to Settings → Authentication → URL Configuration**

3. **Update Site URL**:
   - Change to: `http://localhost:3000`

4. **Add Redirect URLs**:
   - Click **"+ Add URL"**
   - Add: `http://localhost:3000/**`
   - Click **"+ Add URL"** again
   - Add: `http://localhost:3000/auth/callback`
   - Click **"Save"**

---

## ✅ Step 4: Verify Supabase Google Provider

1. **Still in Supabase Dashboard**
   - Go to **Authentication → Providers → Google**

2. **Verify Settings**:
   - ✅ **Enabled**: Toggle should be ON
   - ✅ **Client ID**: `817758642642-j65tb1kscmmaiaocg5jg1qc4qbu4rsbt.apps.googleusercontent.com`
   - ✅ **Client Secret**: Should match Google Cloud Console

3. **If Different**:
   - Copy Client ID from Google Cloud Console
   - Copy Client Secret from Google Cloud Console
   - Paste into Supabase (carefully, no extra spaces)
   - Click **"Save"**

---

## ✅ Step 5: Clear Browser Data

**Clear cookies and cache:**

1. **Open DevTools** (F12)
2. **Go to Application tab → Cookies**
3. **Delete cookies for**:
   - `http://localhost:3000`
   - `https://nonaqhllakrckbtbawrb.supabase.co`
   - `accounts.google.com`

**Or use Incognito/Private Window:**
- Open a new incognito/private window
- Navigate to `http://localhost:3000`
- Try Google Sign-In again

---

## ✅ Step 6: Wait and Test

1. **Wait 2-5 minutes** after making changes (Google needs time to propagate)
2. **Try Google Sign-In again**
3. **If still failing**, check the browser console for specific error messages

---

## Common Error Messages & Fixes

### "Access blocked: This app's request is invalid"
- **Fix**: Publish OAuth consent screen (Step 1)

### "redirect_uri_mismatch"
- **Fix**: Add redirect URI to Google Cloud Console (Step 2)

### "Invalid client"
- **Fix**: Update Client ID/Secret in Supabase (Step 4)

### "Access blocked: This app is in testing mode"
- **Fix**: Either publish the app OR add your email as a test user in Google Cloud Console

---

## Verification Checklist

Before testing, verify:

- [ ] OAuth consent screen is **Published** ("In production", not "Testing")
- [ ] Redirect URI `https://nonaqhllakrckbtbawrb.supabase.co/auth/v1/callback` is in Google Cloud Console
- [ ] Supabase Site URL is `http://localhost:3000`
- [ ] Supabase Redirect URLs include `http://localhost:3000/**` and `http://localhost:3000/auth/callback`
- [ ] Google Provider is enabled in Supabase
- [ ] Client ID/Secret match between Google Cloud Console and Supabase
- [ ] Cleared browser cookies/cache
- [ ] Waited 2-5 minutes after making changes

---

## Still Getting 403?

1. **Check Google Cloud Console Logs**:
   - Go to APIs & Services → Credentials
   - Click on your OAuth Client
   - Check for any warnings or errors

2. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs → Auth Logs
   - Look for detailed error messages

3. **Try Different Browser**:
   - Sometimes browser extensions cause issues
   - Test in Chrome, Firefox, or Safari

---

**Most likely fix**: Publish your OAuth consent screen in Google Cloud Console! (Step 1)




