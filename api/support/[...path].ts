// Catch-all for technical support tickets. One function, several routes — the
// same pattern as api/client-uploads/[...path].ts.
//
// Public:
//   POST /api/support/tickets          open a ticket (Bearer optional)
//   GET  /api/support/thread?key=...   a ticket's thread, by its access key
//   POST /api/support/reply            reply on a ticket, by its access key
//
// Signed in (Bearer access token):
//   GET  /api/support/mine             the caller's tickets
//
// Admin (verifyAdmin):
//   GET  /api/support/admin-list?status=active|open|in_progress|resolved|closed|all
//   GET  /api/support/admin-thread?id=...
//   POST /api/support/admin-reply      { id, message, status?, internal? }
//   POST /api/support/admin-status     { id, status }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    HttpError,
    adminList,
    adminReply,
    adminSetStatus,
    adminThread,
    createServiceClient,
    createTicket,
    getThread,
    listMyTickets,
    requireAdmin,
    userReply,
} from '../../lib/api-handlers/_support-handler.js';

// The URL is the one source of the sub-route that is always there; see
// api/client-uploads/[...path].ts for why the query keys are only fallbacks.
function resolveRoute(req: VercelRequest): string {
    const fromUrl = (req.url || '').split('?')[0]
        .replace(/^\/api\/support\/?/, '')
        .replace(/\/$/, '');
    if (fromUrl) return fromUrl.split('/')[0].toLowerCase();

    const raw = req.query.path || req.query['...path'] || req.query['slug'];
    const joined = Array.isArray(raw) ? raw.join('/') : (raw as string) || '';
    return joined.replace(/\/$/, '').split('/')[0].toLowerCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const route = resolveRoute(req);
    const supabase = createServiceClient();

    try {
        switch (route) {
            case 'tickets': {
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await createTicket(req, supabase));
            }

            case 'thread': {
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await getThread(supabase, (req.query.key as string) || ''));
            }

            case 'reply': {
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await userReply(req, supabase));
            }

            case 'mine': {
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await listMyTickets(req, supabase));
            }

            case 'admin-list': {
                await requireAdmin(req);
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await adminList(supabase, (req.query.status as string) || 'active'));
            }

            case 'admin-thread': {
                await requireAdmin(req);
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await adminThread(supabase, (req.query.id as string) || ''));
            }

            case 'admin-reply': {
                await requireAdmin(req);
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await adminReply(supabase, req.body || {}));
            }

            case 'admin-status': {
                await requireAdmin(req);
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await adminSetStatus(supabase, req.body || {}));
            }

            default:
                return res.status(404).json({ error: 'Not found' });
        }
    } catch (err: any) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
        console.error('[support] Unhandled error:', err);
        return res.status(500).json({ error: err?.message || 'Something went wrong' });
    }
}
