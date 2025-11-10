# Zoho OAuth Client Registration Troubleshooting

## Common Issues & Solutions

### Issue: "Client registration failed"

**Possible causes:**

1. **Redirect URI format issue**
   - Make sure there are NO trailing slashes
   - ✅ Correct: `https://thelostandunfounds.com/oauth/callback`
   - ❌ Wrong: `https://thelostandunfounds.com/oauth/callback/`

2. **JavaScript Domain format**
   - Use ONLY the domain, NO paths
   - ✅ Correct: `thelostandunfounds.com` or `https://thelostandunfounds.com`
   - ❌ Wrong: `https://thelostandunfounds.com/oauth/callback`

3. **Missing required fields**
   - Client Name: Required (e.g., "Lost+Unfounds Email Signup")
   - Client Type: Select "Server-based Applications" or "Web application"

4. **Domain verification**
   - Make sure your domain is verified in Zoho
   - Some Zoho services require domain verification first

## Step-by-Step Fix

### Try This Format:

**Client Name:**
```
Lost+Unfounds Email Signup
```

**Client Type:**
```
Server-based Applications
```
OR
```
Web application
```

**Redirect URI (try without https first):**
```
http://thelostandunfounds.com/oauth/callback
```

**OR try this format:**
```
https://thelostandunfounds.com/oauth/callback
```

**Authorized Domains (try without https://):**
```
thelostandunfounds.com
www.thelostandunfounds.com
```

**OR try with https://:**
```
https://thelostandunfounds.com
https://www.thelostandunfounds.com
```

## Alternative: Use Self-Client Method

If OAuth client registration keeps failing, you can use Zoho's Self-Client method:

1. Go to Zoho API Console
2. Click "Self Client" tab
3. Select scopes: `ZohoCampaigns.contact.READ`, `ZohoCampaigns.contact.CREATE`
4. Generate token directly (no redirect URI needed)

This generates a token without needing to register a client first.
