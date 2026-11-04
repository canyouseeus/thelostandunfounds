Navigate the preview pane to a specific route without a full page reload.

## How it works

`App.tsx` mounts a `NavigationExposer` component (dev-only) that sets `window.__navigate` to React Router's internal `navigate` function. This lets `preview_eval` call it directly — bypassing the two broken approaches:

- ❌ `window.location.href = '/path'` — navigates the page, but the preview eval tool reconnects to `localhost:3000/` (root) in a fresh context on the next call. You end up back at the homepage.
- ❌ `history.pushState() + dispatchEvent(new PopStateEvent(...))` — changes the URL in the address bar but React Router v7 does NOT re-render in response to manual pushState. The UI stays frozen on the current route.
- ✅ `window.__navigate('/path')` — calls React Router's navigate directly, triggers a proper re-render, URL updates, component mounts. No page reload needed.

## Usage

The server must already be running (use `/startdev` if not). Then:

```js
// preview_eval — navigate to any route
window.__navigate('/preview/affiliate?section=affiliate')
```

That's it. One call. Done.

## Full recipe (server not yet running)

1. Start the server:
   `preview_start "Affiliate Dashboard Preview"`

2. Poll until ready:
   ```bash
   until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -qv "^0"; do sleep 2; done
   ```

3. Navigate:
   ```js
   // preview_eval
   window.__navigate('/preview/affiliate?section=affiliate')
   ```

4. Screenshot to confirm. (Black screenshot = expected — noir pre-render div is opacity:0. Check DOM text instead.)

## For auth-protected routes

Auth-protected routes (e.g. `/affiliate`, `/dashboard`) also require a valid session in localStorage. Do the auto-login step from `/startdev` FIRST, then navigate:

```js
// preview_eval — step 1: login
(async () => {
  const res = await fetch('/api/dev/auto-login', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return 'FAILED: ' + data.error;
  localStorage.setItem('sb-nonaqhllakrckbtbawrb-auth-token', JSON.stringify({
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: data.expires_at, token_type: 'bearer', user: data.user
  }));
  return 'OK: ' + data.user?.email;
})()

// preview_eval — step 2: navigate
window.__navigate('/affiliate?section=affiliate')
```

## Preview routes (no auth needed)

These are mock-data pages that work without any login:

| Route | What it shows |
|---|---|
| `/preview/affiliate?section=affiliate` | Full affiliate dashboard with mock data |
| `/preview/visitor` | Visitor-facing preview |
| `/preview/admin-login` | Admin login preview |

## Why `window.__navigate` exists

React Router v7 uses an internal history adapter. There is no public API to navigate from outside the React tree. `NavigationExposer` is a tiny component mounted directly inside `<BrowserRouter>` that captures the `useNavigate` hook and exposes it on `window` in dev mode only. It is stripped in production (`import.meta.env.DEV` guard).

## Known facts

- `window.__navigate` is set after React mounts — it will be `undefined` if called before the app has rendered. If you get "no __navigate", wait a second and retry.
- The preview screenshot always looks black (noir pre-render div, opacity:0). Use `preview_eval` to check `document.body.innerText` or look for specific DOM elements to confirm the right route loaded.
- `preview_navigate` does not reset scroll position — useful for staying in a specific section.
