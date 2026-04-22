---
name: startdev
description: Start the dev server and verify it's working properly.
---

## Pre-flight (run all three in parallel)

```bash
# 1. Clear port
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# 2. Check Supabase (404 or 2xx/4xx = up; 000 = paused)
curl -s -o /dev/null -w "%{http_code}" https://nonaqhllakrckbtbawrb.supabase.co

# 3. Copy .env.local from main repo if missing in worktree
ls .env.local 2>/dev/null || cp /Users/thelostunfounds/thelostandunfounds/.env.local .env.local
```

If Supabase returns `000`: warn the user it's paused at https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb and wait for confirmation.

## Start server

```
preview_start "dev"
```

## Wait for ready, then auto-login

Poll until port 3000 responds (don't use fixed sleep):

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qv "^0"; do sleep 2; done
```

Then run this in `preview_eval` to log in as admin (Google OAuth doesn't work in Preview):

```js
(async () => {
  const res = await fetch('/api/dev/auto-login', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return 'FAILED: ' + data.error;
  localStorage.setItem('sb-nonaqhllakrckbtbawrb-auth-token', JSON.stringify({
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: data.expires_at, token_type: 'bearer', user: data.user
  }));
  location.reload();
  return 'OK: ' + data.user?.email;
})()
```

## Known facts
- Screenshot always looks black — this is correct (noir pre-render div is `opacity:0`). Verify with `preview_eval` checking `document.body.innerText` or `localStorage` session key.
- `vercel dev` is linked to a fresh worktree project with no cloud env vars. The `auto-login.ts` handler loads `.env.local` via dotenv explicitly — this is already in the code.
- Vercel dev takes 30–60s to fully start. Use the poll loop above instead of `sleep`.
- Always use port 3000 (Vercel dev), never 5173 (standalone Vite).
