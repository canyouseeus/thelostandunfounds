# Automated Turnstile Key Rotation Setup

## Overview

This automation rotates your Cloudflare Turnstile secret key and automatically updates it in Supabase Edge Functions secrets.

## Prerequisites

1. **Cloudflare API Token** with `Account:Turnstile:Edit` permission
2. **Cloudflare Account ID**
3. **Turnstile Site Key**
4. **Supabase CLI** installed and logged in
5. **jq** (for JSON parsing) - optional but recommended

## Setup Steps

### Step 1: Get Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template or create custom token with:
   - **Permissions**: `Account:Turnstile:Edit`
   - **Account Resources**: Include your account
4. Copy the token (you won't see it again!)

### Step 2: Get Your Account ID

1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Copy the **Account ID** from the right sidebar

### Step 3: Get Your Turnstile Site Key

1. Go to: https://dash.cloudflare.com/?to=/:account/turnstile
2. Find your Turnstile site
3. Copy the **Site Key** (not the Secret Key)

### Step 4: Configure Environment Variables

Create a `.env.rotation` file (add to `.gitignore`):

```bash
cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds
cat > .env.rotation << EOF
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
TURNSTILE_SITE_KEY=your_site_key_here
SUPABASE_PROJECT_REF=nonaqhllakrckbtbawrb
EOF
```

**⚠️ IMPORTANT**: Add `.env.rotation` to `.gitignore` to keep secrets safe!

### Step 5: Make Script Executable

```bash
chmod +x scripts/rotate-turnstile-key.sh
```

### Step 6: Test the Script

```bash
# Load environment variables
source .env.rotation

# Run the script
./scripts/rotate-turnstile-key.sh
```

## Automation Options

### Option 1: Cron Job (Local/Server)

Add to crontab to run monthly:

```bash
# Edit crontab
crontab -e

# Add this line (runs on 1st of every month at 2 AM)
0 2 1 * * cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds && source .env.rotation && ./scripts/rotate-turnstile-key.sh >> logs/key-rotation.log 2>&1
```

### Option 2: GitHub Actions (Recommended)

Create `.github/workflows/rotate-turnstile-key.yml`:

```yaml
name: Rotate Turnstile Key

on:
  schedule:
    # Run on 1st of every month at 2 AM UTC
    - cron: '0 2 1 * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Supabase CLI
        run: npm install -g supabase
      
      - name: Login to Supabase
        run: supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Link Project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      
      - name: Rotate Turnstile Key
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TURNSTILE_SITE_KEY: ${{ secrets.TURNSTILE_SITE_KEY }}
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
        run: ./scripts/rotate-turnstile-key.sh
```

**GitHub Secrets to Add**:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `TURNSTILE_SITE_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN` (get from `supabase login --token`)

### Option 3: Vercel Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/rotate-turnstile-key",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

Then create an API route that calls the script.

## How It Works

1. **Rotates Secret Key**: Calls Cloudflare API to generate a new secret key
2. **Grace Period**: Old key remains valid for 2 hours (`invalidate_immediately: false`)
3. **Updates Supabase**: Sets new secret in Supabase Edge Functions secrets
4. **Verifies**: Confirms the secret was updated successfully

## Security Notes

- ✅ Script uses environment variables (never hardcode secrets)
- ✅ Old key remains valid for 2 hours (seamless transition)
- ✅ Secrets are stored securely (Supabase, GitHub Secrets, etc.)
- ✅ Script exits on error (fail-safe)

## Troubleshooting

### "Failed to rotate secret key"
- Check Cloudflare API token has correct permissions
- Verify Account ID is correct
- Ensure Site Key is correct

### "Failed to update Supabase secret"
- Verify Supabase CLI is logged in
- Check project ref is correct
- Ensure Supabase CLI has access to project

### "jq: command not found"
- Install jq: `brew install jq` (macOS) or `apt-get install jq` (Linux)
- Or modify script to use `grep`/`sed` instead

## Manual Rotation

If automation fails, rotate manually:

```bash
# 1. Rotate via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/challenges/widgets/$SITE_KEY/rotate_secret" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"invalidate_immediately": false}'

# 2. Get new secret from response
# 3. Update Supabase
npx supabase secrets set TURNSTILE_SECRET_KEY=new_secret_here
```

## Frequency Recommendations

- **Monthly**: Good balance of security and convenience
- **Quarterly**: Less frequent, still secure
- **On-demand**: When security incident occurs

---

**Ready to set up?** Follow the steps above, starting with getting your Cloudflare API token!

