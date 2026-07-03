---
name: fix-webmail
description: Diagnose and fix Platform Webmail (Zoho Mail) errors. Use when the admin webmail page shows "API error: 500", "API error: 404", ERR_MODULE_NOT_FOUND, or messages fail to open.
---

# Fix Platform Webmail

The webmail lives at `/admin` → "Platform Webmail". It routes through:

```
Frontend:  src/components/admin/AdminMailView.tsx
API:       api/mail/[...path].ts          ← Vercel catch-all for all /api/mail/* routes
Handler:   lib/api-handlers/_zoho-mail-handler.ts
Auth:      lib/api-handlers/_zoho-email-utils.ts  ← single source of truth for Zoho auth
```

---

## Symptom: "API error: 500" on folders load

**Check first — stray route file shadowing the catch-all.**

Vercel routes specific files before catch-alls. If `pages/api/mail/folders.ts` or any file under `pages/api/mail/` exists, Vercel serves IT instead of `api/mail/[...path].ts` for that path.

```bash
find pages/api/mail -name "*.ts" 2>/dev/null
```

If anything shows up: delete it. Then check for the `pages/` directory itself — if it's empty, delete that too.

```bash
rm -rf pages/api/mail
# Remove pages/ entirely if nothing else is in it
```

**Why this happened:** A leftover Next.js-style handler was committed under `pages/api/` at some point. Vercel serves `pages/api/` for ALL project types (not just Next.js), so it silently takes priority over the catch-all.

---

## Symptom: ERR_MODULE_NOT_FOUND in Vercel logs

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/lib/api-handlers/_zoho-mail-handler'
imported from /var/task/api/mail/[...path].js
```

**Root cause:** Missing `.js` extension on a relative import in `api/mail/[...path].ts`.

Node.js ESM (which Vercel uses at runtime) requires explicit `.js` extensions even in TypeScript source. TypeScript compilation succeeds without them, so this only surfaces at runtime on Vercel.

**Fix:** Open `api/mail/[...path].ts` and ensure the handler import has `.js`:

```ts
// WRONG — works in tsc but crashes on Vercel
import * as mailHandler from '../../lib/api-handlers/_zoho-mail-handler';

// CORRECT
import * as mailHandler from '../../lib/api-handlers/_zoho-mail-handler.js';
```

Apply the same rule to any other relative imports in `api/` or `lib/` files.

---

## Symptom: "API error: 404" when opening a message

```
GET /api/mail/message/1782072271666158500  404 Not Found
```

**Root cause:** Zoho Mail API requires `folderId` in the URL to fetch message content. The endpoint without it doesn't exist:

```
# 404 — this endpoint does not exist in Zoho's API
GET /api/accounts/{accountId}/messages/{messageId}/content

# 200 — correct form
GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/content
```

**Fix in `AdminMailView.tsx`:** Pass `folderId` when calling `loadMessage`. Each message object from the list already includes `folderId`.

```tsx
// WRONG — folderId missing
onClick={() => loadMessage(msg.messageId)}

// CORRECT
onClick={() => loadMessage(msg.messageId, msg.folderId)}
```

And in `loadMessage`:

```ts
// WRONG
const loadMessage = useCallback(async (messageId: string) => {
  const data = await mailApi(`message/${messageId}`);

// CORRECT
const loadMessage = useCallback(async (messageId: string, folderId?: string) => {
  const qs = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const data = await mailApi(`message/${messageId}${qs}`);
```

---

## Symptom: Auth works for newsletters/receipts but fails for webmail

The newsletter and transactional send path use `lib/api-handlers/_zoho-email-utils.ts`. The webmail handler (`_zoho-mail-handler.ts`) must import auth from the same file — never inline a copy:

```ts
// CORRECT — always import from the single source of truth
import { getZohoAuthContext, ensureBannerHtml } from './_zoho-email-utils.js';
```

If `_zoho-mail-handler.ts` has its own `getZohoAuthContext` or `getZohoAccountInfo` function defined inline, or imports `dotenv` at module level, it has diverged. Delete the inlined copy and use the import above.

---

## Required environment variables

All four must be set in Vercel project settings (not just `.env.local`):

| Variable | Description |
|---|---|
| `ZOHO_CLIENT_ID` | OAuth app client ID |
| `ZOHO_CLIENT_SECRET` | OAuth app client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token (re-generate if expired) |
| `ZOHO_FROM_EMAIL` or `ZOHO_EMAIL` | Sender address (`admin@thelostandunfounds.com`) |
| `ZOHO_ACCOUNT_ID` | Numeric account ID (e.g. `2933450000000008002`) |

To verify env vars are loaded and auth is working, hit the debug endpoint:

```
GET /api/mail/debug
X-Admin-Email: thelostandunfounds@gmail.com
```

Returns `{ accountId, email, tokenPreview }`. If `accountId` is missing or `tokenPreview` is short/empty, the env vars aren't set correctly.

---

## Re-authorizing Zoho (if refresh token is expired or lacks scopes)

Webmail needs READ scopes in addition to the CREATE/DELETE scopes used for sending. If folders load but messages fail with auth errors (not 404), the token may be missing:
- `ZohoMail.folders.READ`
- `ZohoMail.messages.READ`

Re-authorize:

1. Visit `https://www.thelostandunfounds.com/api/mail/auth-url` (admin header required)
2. Copy the `authUrl`, open it in a browser logged into Zoho
3. Authorize → copy the `code` param from the callback URL
4. POST to `/api/mail/exchange-code` with `{ "code": "..." }`
5. Copy `refresh_token` from the response
6. Update `ZOHO_REFRESH_TOKEN` in Vercel → Settings → Environment Variables
7. Redeploy

---

## Debugging workflow

1. Open browser devtools → Network tab, reproduce the error
2. Check which `/api/mail/` request is failing and its status code
3. Check Vercel function logs (Vercel dashboard → Functions → filter by `mail`) for the server-side error
4. Match symptom to section above and apply fix
5. Always check for stray `pages/api/` files first — it's the least obvious cause
