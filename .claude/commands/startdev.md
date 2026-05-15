Start the dev server and verify it's working properly.

## Pre-flight (run in parallel)

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
curl -s -o /dev/null -w "%{http_code}" https://nonaqhllakrckbtbawrb.supabase.co
ls .env.local 2>/dev/null || cp /Users/thelostunfounds/thelostandunfounds/.env.local .env.local
```

If Supabase returns `000`: it's paused — tell the user to resume at https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb and wait for confirmation.

## Start server

`preview_start "dev"`

## Wait for ready, then auto-login

Poll (don't use fixed sleep):
```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qv "^0"; do sleep 2; done
```

Then `preview_eval` to inject the admin session (Google OAuth doesn't work in Preview):
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

Confirm with `preview_eval`: `JSON.stringify({ session: !!localStorage.getItem('sb-nonaqhllakrckbtbawrb-auth-token') })`

## Known facts
- Screenshot always looks black — correct behavior (noir pre-render div is `opacity:0`). Don't retry or reload based on this.
- `vercel dev` takes 30–60s to start. Use the poll loop above, not fixed sleeps.
- Always use port 3000 (Vercel dev), never 5173 (standalone Vite).
- The `auto-login.ts` route explicitly loads `.env.local` via dotenv — Vercel dev does NOT inject `.env.local` into serverless function processes automatically.
