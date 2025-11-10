# How to Get Zoho Access Token from Client ID & Secret

## Option 1: Use Self-Client (Easiest - No Client ID/Secret needed)

If you have Client ID and Secret but want a simpler method:

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click **"Self Client"** tab
3. Select scopes: `ZohoCampaigns.contact.READ` and `ZohoCampaigns.contact.CREATE`
4. Click **Generate**
5. Copy the token - this is your `ZOHO_API_KEY`

## Option 2: Generate Access Token from Client ID & Secret

### Step 1: Get Authorization Code

1. Open this URL in your browser (replace YOUR_CLIENT_ID):
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCampaigns.contact.READ,ZohoCampaigns.contact.CREATE&client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://thelostandunfounds.com/oauth/callback&access_type=offline
```

2. Authorize the application
3. You'll be redirected to a URL like: `https://thelostandunfounds.com/oauth/callback?code=AUTHORIZATION_CODE`
4. Copy the `code` parameter from the URL

### Step 2: Exchange Code for Access Token

Make a POST request to get the access token:

**URL:**
```
https://accounts.zoho.com/oauth/v2/token
```

**Method:** POST

**Body (form-data or x-www-form-urlencoded):**
```
code=AUTHORIZATION_CODE_FROM_STEP_1
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
redirect_uri=https://thelostandunfounds.com/oauth/callback
grant_type=authorization_code
```

**Response will include:**
- `access_token` - This is your `ZOHO_API_KEY`
- `refresh_token` - Save this for refreshing tokens later

## Option 3: Use Refresh Token (For Long-term Use)

Once you have a refresh token, you can get new access tokens:

**URL:**
```
https://accounts.zoho.com/oauth/v2/token
```

**Method:** POST

**Body:**
```
refresh_token=YOUR_REFRESH_TOKEN
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
grant_type=refresh_token
```

## Quick Test with curl

Replace YOUR_CLIENT_ID, YOUR_CLIENT_SECRET, and AUTHORIZATION_CODE:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://thelostandunfounds.com/oauth/callback" \
  -d "grant_type=authorization_code"
```

## Recommendation

**Use Self-Client (Option 1)** - It's much simpler and doesn't require the OAuth flow. Just generate a token directly in the Zoho API Console.

If you must use Client ID/Secret, follow Option 2 to get an access token, then use that access token as your `ZOHO_API_KEY` in Vercel.
