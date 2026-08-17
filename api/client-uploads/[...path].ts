// Catch-all for the client asset intake. One function, several routes: the
// same pattern as api/gallery/[...path].ts, which keeps the deployment's
// serverless function count down.
//
// Public (token in the body/query is the only credential):
//   GET  /api/client-uploads/link?token=...
//   POST /api/client-uploads/sign
//   POST /api/client-uploads/record
//
// Admin (Bearer access token, admin email allowlist):
//   GET  /api/client-uploads/links
//   POST /api/client-uploads/links
//   POST /api/client-uploads/toggle
//   POST /api/client-uploads/invite
//   POST /api/client-uploads/retry-mirror
//   GET  /api/client-uploads/uploads?linkId=...
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    HttpError,
    createServiceClient,
    createLink,
    getPublicLink,
    listLinks,
    listUploads,
    recordBatch,
    requireAdmin,
    retryMirror,
    sendInvite,
    setLinkActive,
    signUploads,
} from '../../lib/api-handlers/_client-uploads-handler.js';

// Vercel doesn't reliably populate req.query.path for a catch-all; it may
// arrive under '...path' or 'slug', or not at all, depending on the runtime
// version. api/gallery/[...path].ts hit the same thing. The URL itself is the
// one source that's always there, so read that first and treat the query keys
// as fallbacks.
function resolveRoute(req: VercelRequest): string {
    const fromUrl = (req.url || '').split('?')[0]
        .replace(/^\/api\/client-uploads\/?/, '')
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
            case 'link': {
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                const token = (req.query.token as string) || '';
                return res.status(200).json(await getPublicLink(supabase, token));
            }

            case 'sign': {
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await signUploads(supabase, req.body || {}));
            }

            case 'record': {
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await recordBatch(supabase, req.body || {}));
            }

            case 'links': {
                await requireAdmin(req, supabase);
                if (req.method === 'GET') return res.status(200).json({ links: await listLinks(supabase) });
                if (req.method === 'POST') return res.status(200).json(await createLink(supabase, req.body || {}));
                return res.status(405).json({ error: 'Method not allowed' });
            }

            case 'toggle': {
                await requireAdmin(req, supabase);
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                const { id, is_active } = req.body || {};
                if (!id) return res.status(400).json({ error: 'id is required' });
                return res.status(200).json({ link: await setLinkActive(supabase, id, !!is_active) });
            }

            case 'invite': {
                await requireAdmin(req, supabase);
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                return res.status(200).json(await sendInvite(supabase, req.body || {}));
            }

            case 'retry-mirror': {
                await requireAdmin(req, supabase);
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                const { id } = req.body || {};
                if (!id) return res.status(400).json({ error: 'id is required' });
                return res.status(200).json(await retryMirror(supabase, id));
            }

            case 'uploads': {
                await requireAdmin(req, supabase);
                if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
                const linkId = (req.query.linkId as string) || '';
                if (!linkId) return res.status(400).json({ error: 'linkId is required' });
                return res.status(200).json({ uploads: await listUploads(supabase, linkId) });
            }

            default:
                return res.status(404).json({ error: 'Not found' });
        }
    } catch (err: any) {
        if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
        console.error('[client-uploads] Unhandled error:', err);
        return res.status(500).json({ error: err?.message || 'Something went wrong' });
    }
}
