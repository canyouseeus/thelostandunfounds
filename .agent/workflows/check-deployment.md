---
description: Check Vercel deployment status after pushing to main
---

# Check Vercel Deployment Status

After pushing changes to the `main` branch, use this workflow to verify deployment status.

## Prerequisites

1. Ensure `VERCEL_TOKEN` is set in `.env.local`:
   ```
   VERCEL_TOKEN=your_vercel_api_token
   ```
   Get a token from: https://vercel.com/account/tokens

2. Optionally set `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` if needed

## Steps

// turbo-all

1. Check the latest deployment status:
```bash
cd /Users/thelostunfounds/.gemini/antigravity/scratch/thelostandunfounds && bash scripts/check-vercel-deployment.sh
```

2. If still building, wait 30 seconds and check again:
```bash
sleep 30 && bash scripts/check-vercel-deployment.sh
```

3. Once READY, verify the deployed page works:
```bash
curl -s -o /dev/null -w "%{http_code}" https://www.thelostandunfounds.com/gallery/last-night
```

Expected: `200` for success

## Quick Command

To poll until deployment is ready (checks every 15 seconds, max 20 attempts):
```bash
for i in {1..20}; do
  STATUS=$(bash scripts/check-vercel-deployment.sh 2>&1)
  echo "$STATUS"
  if echo "$STATUS" | grep -q "READY"; then
    echo "✅ Deployment complete!"
    break
  fi
  echo "Waiting 15 seconds..."
  sleep 15
done
```
