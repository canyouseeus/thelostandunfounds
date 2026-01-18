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
        // --- METADATA NORMALIZATION & DATE PARSING ---
        let metadata = file.imageMediaMetadata || {} as any;
        let finalCreatedAt = file.createdTime || new Date().toISOString();

        // 1. Map camelCase to snake_case for frontend consistency
        if (metadata.cameraMake) metadata.camera_make = metadata.cameraMake;
        if (metadata.cameraModel) metadata.camera_model = metadata.cameraModel;
        if (metadata.focalLength) metadata.focal_length = metadata.focalLength;
        if (metadata.isoSpeed) metadata.iso = metadata.isoSpeed;
        if (metadata.exposureTime) metadata.shutter_speed = metadata.exposureTime;

        // 2. Parse 'time' (Capture Time)
        // Drive format is often "YYYY:MM:DD HH:MM:SS" which new Date() often fails on
        const captureTimeStr = metadata.time;

        if (captureTimeStr) {
            let captureDate: Date | null = null;

            // Try standard parse
            const stdParse = new Date(captureTimeStr);
            if (!isNaN(stdParse.getTime())) {
                captureDate = stdParse;
            } else {
                // Try parsing "YYYY:MM:DD HH:MM:SS" manually
                const parts = captureTimeStr.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (parts) {
                    captureDate = new Date(
                        parseInt(parts[1]),
                        parseInt(parts[2]) - 1, // Month is 0-indexed
                        parseInt(parts[3]),
                        parseInt(parts[4]),
                        parseInt(parts[5]),
                        parseInt(parts[6])
                    );
                }
            }

            if (captureDate && !isNaN(captureDate.getTime())) {
                // Smart Year Correction (2025 -> 2026 if needed)
                // If Capture Year is 2025 but Upload Year is 2026, force 2026
                // (This is specific logic for the user's "Last Night" event context)
                const uploadDate = new Date(finalCreatedAt);
                if (captureDate.getFullYear() === 2025 && uploadDate.getFullYear() === 2026) {
                    captureDate.setFullYear(2026);
                    metadata._corrected = true;
                }

                // Update the metadata time to ISO format for easier frontend sorting
                metadata.time = captureDate.toISOString();
                metadata.date_taken = captureDate.toISOString(); // Use this for main sort
                finalCreatedAt = captureDate.toISOString();
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
                metadata: metadata // Store full (and normalized) metadata
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
