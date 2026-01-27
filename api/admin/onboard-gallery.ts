import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { syncGalleryPhotos } from '../lib/api-handlers/_photo-sync-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, folderId, name, description, isPrivate, ownerId } = req.body;

        if (!token || !folderId) {
            return res.status(400).json({ error: 'Missing requirements' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 1. Verify invitation
        const { data: invite, error: inviteError } = await supabase
            .from('gallery_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (inviteError || !invite) {
            return res.status(400).json({ error: 'Invalid or expired invitation' });
        }

        // 2. Create Library (Gallery)
        // Default slug from name + random suffix to ensure uniqueness
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

        const { data: library, error: libError } = await supabase
            .from('photo_libraries')
            .insert({
                name: name,
                slug: slug,
                description: description || 'New gallery',
                google_drive_folder_id: folderId,
                owner_id: ownerId, // Link gallery to the user
                is_private: isPrivate !== undefined ? isPrivate : true, // Default to private
                status: 'active',
                password_protected: false,
                price: 5.00 // Default price
            })
            .select()
            .single();

        if (libError) {
            throw new Error(`Failed to create library: ${libError.message}`);
        }

        // 3. Mark invite as accepted
        await supabase
            .from('gallery_invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invite.id);

        // 4. (Removed) Sync is now triggered separately by the frontend
        // via /api/admin/sync-library for better error handling and UX status.


        return res.status(200).json({ success: true, slug, message: 'Gallery created and syncing started' });

    } catch (err: any) {
        console.error('Onboard error:', err);
        return res.status(500).json({ error: err.message });
    }
}
