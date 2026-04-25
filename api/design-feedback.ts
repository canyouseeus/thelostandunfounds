import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        try {
            const supabase = getSupabase();
            const { component, status } = req.query;

            let query = supabase
                .from('design_feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (component && typeof component === 'string') {
                query = query.eq('component', component);
            }
            if (status && typeof status === 'string') {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { component, comment, submitted_by } = req.body;
            if (!component || !comment) {
                return res.status(400).json({ error: 'component and comment are required' });
            }

            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('design_feedback')
                .insert({ component, comment, submitted_by: submitted_by || null, status: 'pending' })
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });
            return res.status(201).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'PATCH') {
        try {
            const { id, status, resolution } = req.body;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (status !== undefined) updates.status = status;
            if (resolution !== undefined) updates.resolution = resolution;

            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('design_feedback')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) return res.status(500).json({ error: error.message });
            if (!data) return res.status(404).json({ error: 'Feedback not found' });
            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'id query param is required' });
            }

            const supabase = getSupabase();
            const { error } = await supabase
                .from('design_feedback')
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
