import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export async function syncGalleryPhotos(librarySlug: string) {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    // Strict sanitization for email and key
    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    // Improved key parsing: handle literal \n and real newlines, ensuring standard format
    const GOOGLE_KEY = (rawKey || '')
        .replace(/\\n/g, '\n')
        .replace(/"/g, '') // Remove quotes if accidentally included
        .trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
        console.error('Sync missing credentials:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
            hasEmail: !!GOOGLE_EMAIL,
            emailValue: GOOGLE_EMAIL, // Log sanitized email for verification
            hasKey: !!GOOGLE_KEY,
            keyLength: GOOGLE_KEY.length,
            keyPrefix: GOOGLE_KEY.substring(0, 20)
        });
        throw new Error(`Missing credentials for synchronization. Email: ${!!GOOGLE_EMAIL}, Key: ${!!GOOGLE_KEY}`);
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
        fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, mimeType, imageMediaMetadata)', // Added imageMediaMetadata
        pageSize: 1000,
    });

    const files = response.data.files || [];

    // 4. Upsert into Supabase
    for (const file of files) {
        if (!file.id || !file.name) continue;

        const title = file.name.split('.').slice(0, -1).join('.');
        const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');

        // --- METADATA & SMART DATE CORRECTION ---
        let metadata = file.imageMediaMetadata || {};
        let finalCreatedAt = file.createdTime || new Date().toISOString();

        // Drive API 'time' field in imageMediaMetadata is the capture time
        const captureTime = metadata.time;

        if (captureTime) {
            const captureDate = new Date(captureTime);
            const uploadDate = new Date(finalCreatedAt);

            // If Capture Year is 2025 but Upload Year is 2026
            if (captureDate.getFullYear() === 2025 && uploadDate.getFullYear() === 2026) {
                // Force the year to 2026, keep month/day/time
                captureDate.setFullYear(2026);

                // Use a descriptive name for the corrected metadata to avoid TS errors
                // and store it in a way that doesn't violate the schema if we cast to any for storage
                finalCreatedAt = captureDate.toISOString();

                // If we want to mark it as corrected in the metadata we store in Supabase
                // we can cast to any here since Supabase jsonb doesn't care about Google's schema
                (metadata as any)._corrected = true;
                (metadata as any).time = captureDate.toISOString();
            } else {
                // Use capture time as the primary sort time if available and valid
                finalCreatedAt = captureTime;
            }
        }
        // ----------------------------------------

        await supabase
            .from('photos')
            .upsert({
                library_id: library.id,
                google_drive_file_id: file.id,
                title: title,
                thumbnail_url: thumbnailUrl,
                status: 'active',
                mime_type: file.mimeType,
                created_at: finalCreatedAt,
                metadata: metadata // Store full metadata
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
