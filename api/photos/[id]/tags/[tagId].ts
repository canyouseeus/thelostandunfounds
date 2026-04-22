import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../../../../lib/api-handlers/_supabase-admin-client';
import { removeTagFromPhoto } from '../../../../src/lib/tags';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

async function requireAdmin(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes(user.email || '') ? user : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, tagId } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Photo ID is required' });
    }
    if (!tagId || typeof tagId !== 'string') {
        return res.status(400).json({ error: 'Tag ID is required' });
    }

    const admin = await requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    try {
        const supabase = createServiceSupabaseClient();
        await removeTagFromPhoto(supabase, id, tagId);
        return res.status(204).end();
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
