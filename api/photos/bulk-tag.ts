import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../../lib/api-handlers/_supabase-admin-client';
import { bulkTagPhotos } from '../../src/lib/tags';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

async function requireAdmin(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes(user.email || '') ? user : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const admin = await requireAdmin(req);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    try {
        const { photoIds, tagIds } = req.body;

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            return res.status(400).json({ error: 'photoIds array is required' });
        }
        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ error: 'tagIds array is required' });
        }

        const supabase = createServiceSupabaseClient();
        await bulkTagPhotos(supabase, photoIds, tagIds);

        return res.status(200).json({
            success: true,
            message: `Tagged ${photoIds.length} photos with ${tagIds.length} tags`,
        });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
