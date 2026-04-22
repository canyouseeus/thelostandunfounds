import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../../lib/api-handlers/_supabase-admin-client';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

async function requireAdmin(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes(user.email || '') ? user : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Tag ID is required' });
    }

    if (req.method === 'PUT') {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        try {
            const { name, metadata } = req.body;
            if (!name && metadata === undefined) {
                return res.status(400).json({ error: 'Nothing to update' });
            }

            const updates: Record<string, any> = {};
            if (name) updates.name = name;
            if (metadata !== undefined) updates.metadata = metadata;

            const supabase = createServiceSupabaseClient();
            const { data, error } = await supabase
                .from('tags')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') return res.status(404).json({ error: 'Tag not found' });
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'DELETE') {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        try {
            const supabase = createServiceSupabaseClient();
            const { error } = await supabase
                .from('tags')
                .delete()
                .eq('id', id);

            if (error) return res.status(500).json({ error: error.message });
            return res.status(204).end();
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
