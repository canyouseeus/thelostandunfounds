import type { VercelRequest, VercelResponse } from '@vercel/node';

// This file is just a re-export to match the dynamic import pattern in [...path].ts
// The actual logic is in api/admin/sync-library.ts, but we need it in lib/api-handlers
// for the dynamic import to work cleanly if we want to follow the pattern.
// HOWEVER, checking [...path].ts, it imports from ../../lib/api-handlers/...
// So I should move the logic to lib/api-handlers/_sync-library-handler.ts OR
// adjust the import in [...path].ts to point to ../../api/admin/sync-library.js

// Let's stick to the pattern: logic in lib/api-handlers
import handler from '../../api/admin/sync-library';
export default handler;
