import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export async function syncGalleryPhotos(librarySlug: string) {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    // Strict sanitization for email and key
    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    const GOOGLE_KEY = (rawKey || '').replace(/\\n/g, '\n').trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
        console.error('Sync missing credentials:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
            hasEmail: !!GOOGLE_EMAIL,
            hasKey: !!GOOGLE_KEY
        });
        throw new Error('Missing credentials for synchronization');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get Library Details
    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('*')
        .eq('slug', librarySlug)
        .single();

    if (libError || !library) {
        throw new Error(`Library not found: ${librarySlug}`);
    }

    const folderId = library.google_drive_folder_id;

    // 2. Init Google Drive
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_EMAIL,
            private_key: GOOGLE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 3. List files entries
    const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'video/quicktime') and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, mimeType)',
        pageSize: 1000,
    });

    const files = response.data.files || [];

    // 4. Upsert into Supabase
    for (const file of files) {
        if (!file.id || !file.name) continue;

        const title = file.name.split('.').slice(0, -1).join('.');
        const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');

        await supabase
            .from('photos')
            .upsert({
                library_id: library.id,
                google_drive_file_id: file.id,
                title: title,
                thumbnail_url: thumbnailUrl,
                status: 'active',
                mime_type: file.mimeType,
                created_at: file.createdTime || new Date().toISOString()
            }, {
                onConflict: 'google_drive_file_id'
            });
    }

    // 5. Cleanup
    const currentDriveFileIds = new Set(files.map(f => f.id));
    const { data: existingPhotos } = await supabase
        .from('photos')
        .select('google_drive_file_id')
        .eq('library_id', library.id);

    if (existingPhotos) {
        const photosToDelete = existingPhotos
            .filter(p => p.google_drive_file_id && !currentDriveFileIds.has(p.google_drive_file_id))
            .map(p => p.google_drive_file_id);

        if (photosToDelete.length > 0) {
            await supabase
                .from('photos')
                .delete()
                .in('google_drive_file_id', photosToDelete);
        }
    }

    return { synced: files.length, deleted: existingPhotos?.length || 0 - files.length };
}
