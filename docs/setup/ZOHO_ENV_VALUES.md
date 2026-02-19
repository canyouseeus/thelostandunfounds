# Zoho Mail Environment Variables for Vercel

Copy these values to Vercel Environment Variables:

## Step 1: Add These 4 Variables

Go to: https://vercel.com/joshua-greenes-projects/thelostandunfounds/settings/environment-variables

### 1. ZOHO_CLIENT_ID
- **Key**: `ZOHO_CLIENT_ID`
- **Value**: [Your Client ID from Zoho - starts with 1000.]
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 2. ZOHO_CLIENT_SECRET
- **Key**: `ZOHO_CLIENT_SECRET`
- **Value**: [Your Client Secret from Zoho]
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 3. ZOHO_REFRESH_TOKEN
- **Key**: `ZOHO_REFRESH_TOKEN`
- **Value**: [Will generate this next - leave empty for now]
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 4. ZOHO_FROM_EMAIL
- **Key**: `ZOHO_FROM_EMAIL`
- **Value**: [Your Zoho Mail email - e.g., noreply@thelostandunfounds.com]
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

---

## Step 2: Generate Refresh Token

After adding Client ID and Client Secret, we'll generate the refresh token.

