---
description: How to add new API routes ensuring both local dev and Vercel production work
---

# API Route Development Workflow

This project has TWO API systems that MUST stay in sync:
1. **local-server.js** - Node.js HTTP server for local development (runs on port 3002)
2. **api/** directory - Vercel serverless functions for production

## ⚠️ CRITICAL RULE

**Every API endpoint MUST exist in BOTH systems.** If you add a route to `local-server.js`, you MUST also create the corresponding file in `api/`. Failing to do this causes 404 errors in production while appearing to work locally.

---

## Step 1: Audit Existing Routes (Before Starting)

// turbo
Run the audit script to identify any routes missing in production:
```bash
cd /Users/thelostunfounds/.gemini/antigravity/scratch/thelostandunfounds && bash scripts/audit-api-routes.sh
```

---

## Step 2: Adding a New API Route

When adding a new endpoint (e.g., `/api/admin/analytics/record`):

### 2a. Create the Vercel API Route FIRST

Create the file in the `api/` directory matching the URL path:

| URL Path | File Location |
|----------|---------------|
| `/api/admin/analytics/record` | `api/admin/analytics/record.ts` |
| `/api/gallery/sync` | `api/gallery/sync.ts` OR `api/gallery/[...path].ts` with handler |
| `/api/shop/checkout` | `api/shop/checkout.ts` |

**Template for Vercel API route:**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') { // or GET, depending on endpoint
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        
        // Your logic here
        const { field1, field2 } = req.body;
        
        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
```

### 2b. Add to local-server.js for Dev Parity

Add the route handler in `local-server.js` following the existing pattern:

```javascript
// In local-server.js, find the appropriate section and add:
if (pathname === '/api/your/endpoint' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const { field1, field2 } = JSON.parse(body || '{}');
            
            // Your logic here (matching Vercel route)
            
            return setJsonRes(200, { success: true });
        } catch (error) {
            console.error('Error:', error);
            return setJsonRes(500, { error: error.message });
        }
    });
    return;
}
```

---

## Step 3: Verify Both Systems

// turbo
1. Test locally:
```bash
curl -X POST http://localhost:3002/api/your/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field1": "test"}'
```

2. After deployment, test production:
```bash
curl -X POST https://www.thelostandunfounds.com/api/your/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field1": "test"}'
```

---

## API Route Patterns Reference

| Pattern | Example | Notes |
|---------|---------|-------|
| Static route | `api/admin/stats.ts` | Single endpoint |
| Dynamic route | `api/gallery/[slug].ts` | Uses `req.query.slug` |
| Catch-all | `api/gallery/[...path].ts` | Uses `req.query.path` array |
| Nested static | `api/admin/analytics/record.ts` | Multi-level path |

---

## Common Mistakes to Avoid

❌ **DON'T** add routes only to `local-server.js`
❌ **DON'T** assume Vite/Vercel dev will auto-route to local-server.js
❌ **DON'T** forget to test production after deployment

✅ **DO** create Vercel API file first, then add local-server.js handler
✅ **DO** use the audit script before deployments
✅ **DO** keep business logic identical in both systems (or extract to shared lib)

---

## Existing Route Inventory

Routes that exist in `local-server.js` MUST have corresponding `api/` files:

### Currently Synced ✅
- `/api/gallery/stream` → `api/gallery/[...path].ts`
- `/api/gallery/sync` → `api/gallery/[...path].ts`
- `/api/shop/*` → `api/shop/` directory
- `/api/admin/invite-photographer` → `api/admin/invite-photographer.ts`

### MISSING (Needs Creation) ⚠️
- `/api/admin/analytics/record` → NEEDS `api/admin/analytics/record.ts`
- `/api/admin/analytics/stats` → NEEDS `api/admin/analytics/stats.ts`
- `/api/admin/affiliates` → CHECK if exists

---

## Quick Fix: Create Missing Route

If you find a route exists in `local-server.js` but not in `api/`:

// turbo
1. Find the handler in local-server.js:
```bash
grep -n "pathname === '/api/your/route'" local-server.js
```

2. Create the corresponding Vercel API file with matching logic

3. Commit both changes together

4. Run deployment check:
```bash
bash scripts/check-vercel-deployment.sh
```
