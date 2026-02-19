---
description: Full deployment pipeline with live verification. Use this whenever pushing changes to production.
---

# Deploy and Verify Workflow

> Never mark a deployment as complete without verification.

## Steps

// turbo-all

### 1. Ensure you're on a working branch
```bash
git status
git branch --show-current
```

### 2. Stage and commit
```bash
git add -A
git commit -m "descriptive message about the change"
```

### 3. Merge to main
```bash
git checkout main
git pull origin main
git merge <your-branch>
git push origin main
```

### 4. Wait for deployment
Vercel auto-deploys from `main`. Wait 60-90 seconds for the build to complete.

### 5. Verify deployment status
Check that the Vercel deployment state is "READY" (not "BUILDING" or "ERROR").

### 6. Verify the live URL
```bash
curl -s -o /dev/null -w "%{http_code}" https://www.thelostandunfounds.com
```
Expected: `200`

### 7. Verify the specific change
Depending on what you deployed:
- **Blog post SQL**: Check `https://www.thelostandunfounds.com/sql` — script must appear in list
- **API endpoint**: Hit the endpoint and verify response
- **UI change**: Load the page and verify visually
- **Email template**: Send a test email and verify branding

### 8. Report results
Tell the user:
- ✅ Deployment status (READY)
- ✅ Live URL accessible
- ✅ Specific change verified
- OR ❌ What failed and what you're doing about it

## If Deployment Fails

1. Check build logs for errors
2. Fix the error locally
3. **Loop back to Step 2** — commit the fix and redeploy
4. If stuck after 2 attempts, escalate to the user
