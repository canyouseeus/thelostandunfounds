# Zoho Mail OAuth Setup Guide

## Why OAuth is Required

Zoho Mail API requires OAuth 2.0 authentication (not just an API key). You need:
- **Client ID** - Your OAuth application identifier
- **Client Secret** - Your OAuth application secret
- **Refresh Token** - Long-lived token to get access tokens
- **From Email** - The email address to send from

The existing `ZOHO_API_KEY` is likely for a different Zoho service and won't work for Mail API.

---

## Step-by-Step: Get OAuth Credentials from Zoho

### Step 1: Go to Zoho Developer Console

1. **Visit**: https://api-console.zoho.com/
2. **Sign in** with your Zoho account (the one with your email domain)

### Step 2: Create a New Client/Application

1. Click **"Add Client"** or **"ADD"** button
2. Select **"Server-based Applications"** (not Web-based or Mobile)
3. Fill in the form:
   - **Client Name**: `THE LOST+UNFOUNDS Mail API` (or any name)
   - **Homepage URL**: `https://thelostandunfounds.com`
   - **Authorized Redirect URIs**: 
     - `https://thelostandunfounds.com/auth/callback`
     - `http://localhost:3000/auth/callback` (for local testing)
   - **Scopes**: Select these scopes:
     - `ZohoMail.messages.CREATE` - To send emails
     - `ZohoMail.accounts.READ` - To read account info
     - `ZohoMail.organization.READ` - To read organization info
4. Click **"CREATE"**

### Step 3: Copy Client ID and Client Secret

After creation, you'll see:
- **Client ID** - Copy this (looks like: `1000.ABC123...`)
- **Client Secret** - Click "Generate" or copy if shown (looks like: `abc123def456...`)

**Save these immediately** - you'll need them for environment variables.

### Step 4: Generate Refresh Token

1. **Build the authorization URL**:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.organization.READ&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://thelostandunfounds.com/auth/callback&access_type=offline
   ```
   
   Replace `YOUR_CLIENT_ID` with your actual Client ID.

2. **Open the URL in your browser** - You'll be asked to authorize the application

3. **Authorize** - Click "Accept" or "Allow"

4. **Copy the authorization code** from the redirect URL:
   ```
   https://thelostandunfounds.com/auth/callback?code=AUTHORIZATION_CODE_HERE
   ```
   
   Copy the `code` parameter value.

5. **Exchange authorization code for refresh token**:
   
   Run this command (replace values):
   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=https://thelostandunfounds.com/auth/callback" \
     -d "code=AUTHORIZATION_CODE_FROM_STEP_4"
   ```

6. **Copy the refresh_token** from the response:
   ```json
   {
     "access_token": "...",
     "refresh_token": "1000.abc123...",  ← Copy this
     "expires_in": 3600,
     ...
   }
   ```

### Step 5: Get Your From Email Address

This should be your Zoho Mail email address:
- Format: `yourname@yourdomain.com`
- Example: `noreply@thelostandunfounds.com` or `hello@thelostandunfounds.com`

---

## Step 6: Add to Vercel Environment Variables

Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

Add these variables:

1. **ZOHO_CLIENT_ID**
   - Value: Your Client ID from Step 3
   - Environments: Production, Preview, Development

2. **ZOHO_CLIENT_SECRET**
   - Value: Your Client Secret from Step 3
   - Environments: Production, Preview, Development

3. **ZOHO_REFRESH_TOKEN**
   - Value: Your Refresh Token from Step 4
   - Environments: Production, Preview, Development

4. **ZOHO_FROM_EMAIL**
   - Value: Your email address (e.g., `noreply@thelostandunfounds.com`)
   - Environments: Production, Preview, Development

5. **Click "Save"** for each variable

---

## Step 7: Redeploy

After adding environment variables:
1. Go to Vercel Dashboard → Deployments
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to trigger redeploy

---

## Quick Test

After setup, test the newsletter subscription:
1. Visit your homepage
2. Enter an email in the signup form
3. Submit
4. Check your email inbox for the confirmation email

---

## Troubleshooting

### "Invalid client_id" error
- Double-check Client ID is correct
- Make sure you copied the full Client ID (starts with `1000.`)

### "Invalid refresh_token" error
- Regenerate refresh token (Step 4)
- Make sure refresh token hasn't expired
- Check that scopes include `ZohoMail.messages.CREATE`

### "Failed to authenticate" error
- Verify all environment variables are set correctly
- Check that Client Secret matches Client ID
- Ensure refresh token is valid

### Emails not sending
- Check Zoho Mail API status: https://status.zoho.com/
- Verify your Zoho Mail account is active
- Check Vercel function logs for detailed errors

---

## Alternative: Use Zoho Mail SMTP

If OAuth setup is too complex, you can use SMTP instead:
- Requires different code changes
- Less secure but simpler setup
- Contact me if you want to switch to SMTP

---

## Security Notes

- **Never commit** these credentials to git
- **Client Secret** and **Refresh Token** are sensitive - keep them secure
- **Rotate credentials** if compromised
- Use **environment variables** only (never hardcode)

