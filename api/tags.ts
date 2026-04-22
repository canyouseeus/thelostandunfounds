import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../lib/api-handlers/_supabase-admin-client';
import { createTag, type TagType } from '../src/lib/tags';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

async function requireAdmin(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes(user.email || '') ? user : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        try {
            const supabase = createServiceSupabaseClient();
            const { type } = req.query;

            let query = supabase.from('tags').select('*').order('name');
            if (type && typeof type === 'string') {
                query = query.eq('type', type);
            }

            const { data, error } = await query;
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        try {
            const { name, type, metadata } = req.body;
            if (!name || !type) {
                return res.status(400).json({ error: 'name and type are required' });
            }

            const validTypes: TagType[] = ['location', 'venue', 'collection', 'people', 'event', 'custom'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
            }

            const supabase = createServiceSupabaseClient();
            const tag = await createTag(supabase, name, type, metadata);
            return res.status(201).json(tag);
        } catch (err: any) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'A tag with this name and type already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
