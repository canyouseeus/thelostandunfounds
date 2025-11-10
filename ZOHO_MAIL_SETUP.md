# Zoho Mail Setup Guide for thelostandunfounds.com

## Step 1: Sign Up for Zoho Mail

1. Go to [Zoho Mail](https://www.zoho.com/mail/)
2. Click "Sign Up Now" or "Get Started"
3. Choose the **Free Plan** (5 users, 5GB per user)
4. Sign up with any email address you currently have access to

## Step 2: Add Your Domain

1. After signing up, go to **Control Panel** → **Domains**
2. Click **Add Domain**
3. Enter: `thelostandunfounds.com`
4. Click **Add**

## Step 3: Verify Domain Ownership

Zoho will ask you to verify you own the domain. You'll need to add DNS records:

### Option A: Add TXT Record (Recommended)
1. Go to your domain registrar (where you bought thelostandunfounds.com)
2. Go to DNS settings
3. Add a **TXT record**:
   - **Name/Host:** `@` or `thelostandunfounds.com`
   - **Value:** (Zoho will give you a verification code - copy it here)
   - **TTL:** 3600

### Option B: Add MX Records (For email to work)
After verification, Zoho will give you MX records. Add these:

```
MX Record 1:
- Name: @
- Value: mx.zoho.com
- Priority: 10

MX Record 2:
- Name: @
- Value: mx2.zoho.com
- Priority: 20
```

### Option C: Add CNAME Record (For webmail)
```
- Name: mail
- Value: business.zoho.com
```

## Step 4: Wait for Verification

- DNS changes can take 24-48 hours to propagate
- Zoho will verify automatically once DNS records are detected
- You'll get an email when verification is complete

## Step 5: Create Email Account

1. Once verified, go to **Control Panel** → **Users**
2. Click **Add User**
3. Create: `admin@thelostandunfounds.com`
4. Set a password
5. Complete setup

## Step 6: Connect to EmailJS

1. Log in to your new Zoho Mail account at [mail.zoho.com](https://mail.zoho.com)
2. Go to EmailJS dashboard
3. **Email Services** → **Add New Service** → **Zoho**
4. Enter your Zoho Mail credentials:
   - Email: `admin@thelostandunfounds.com`
   - Password: (your Zoho Mail password)
5. Copy the **Service ID**

## Step 7: Create EmailJS Template

1. Go to **Email Templates** → **Create New Template**
2. Use this template:

**Subject:** `New Email List Sign-up`

**Content:**
```
You have a new subscriber!

Email: {{subscriber_email}}

Reply to: {{reply_to}}
```

3. Copy the **Template ID**

## Step 8: Get EmailJS Public Key

1. Go to **Account** → **API Keys**
2. Copy your **Public Key**

## Step 9: Add to Vercel

Go to Vercel → Your Project → Settings → Environment Variables:

```
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_ID=template_xxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx
RECIPIENT_EMAIL=admin@thelostandunfounds.com
```

## Step 10: Test

1. Deploy your site (or wait for auto-deploy)
2. Visit your homepage
3. Enter an email in the sign-up form
4. Check `admin@thelostandunfounds.com` for the notification email

## Troubleshooting

**DNS not verifying?**
- Wait 24-48 hours for DNS propagation
- Double-check DNS records are correct
- Use a DNS checker tool to verify records are live

**Can't connect Zoho to EmailJS?**
- Make sure you're using the correct Zoho Mail password
- Try enabling "Less Secure Apps" in Zoho settings
- Or use Zoho's App Password instead

**Need help?**
- Zoho Support: https://help.zoho.com/
- EmailJS Support: https://www.emailjs.com/support/
