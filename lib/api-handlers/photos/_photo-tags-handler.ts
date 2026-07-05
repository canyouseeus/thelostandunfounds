import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../_supabase-admin-client';
import { addTagToPhoto, getPhotoTags, removeTagFromPhoto } from '../../../src/lib/tags';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

async function requireAdmin(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes(user.email || '') ? user : null;
}

// GET/POST /api/photos/:id/tags
export async function photoTagsHandler(req: VercelRequest, res: VercelResponse, id: string) {
    if (!id) {
        return res.status(400).json({ error: 'Photo ID is required' });
    }

    if (req.method === 'GET') {
        try {
            const supabase = createServiceSupabaseClient();
            const tags = await getPhotoTags(supabase, id);
            return res.status(200).json(tags);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        try {
            const { tagIds } = req.body;
            if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
                return res.status(400).json({ error: 'tagIds array is required' });
            }

            const supabase = createServiceSupabaseClient();
            const results = [];

            for (const tagId of tagIds) {
                try {
                    const photoTag = await addTagToPhoto(supabase, id, tagId);
                    results.push({ tagId, success: true, data: photoTag });
                } catch (err: any) {
                    if (err.code === '23505') {
                        results.push({ tagId, success: true, alreadyExists: true });
                    } else {
                        results.push({ tagId, success: false, error: err.message });
                    }
                }
            }

            return res.status(200).json({ results });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// DELETE /api/photos/:id/tags/:tagId
export async function removePhotoTagHandler(req: VercelRequest, res: VercelResponse, id: string, tagId: string) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!id) {
        return res.status(400).json({ error: 'Photo ID is required' });
    }
    if (!tagId) {
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
