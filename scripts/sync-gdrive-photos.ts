import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
    console.error('❌ Missing required environment variables. Check .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function syncFolder(folderId: string, librarySlug: string) {
    try {
        console.log(`🔍 Syncing folder ${folderId} for library ${librarySlug}...`);

        // 1. Get Library ID
        const { data: library, error: libError } = await supabase
            .from('photo_libraries')
            .select('id')
            .eq('slug', librarySlug)
            .single();

        if (libError || !library) {
            throw new Error(`Library not found: ${librarySlug}`);
        }

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
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: 'files(id, name, thumbnailLink, webContentLink)',
            pageSize: 100,
        });

        const files = response.data.files || [];
        console.log(`📸 Found ${files.length} images in Google Drive folder.`);

        // 4. Upsert into Supabase
        for (const file of files) {
            if (!file.id || !file.name) continue;

            // Extract title from filename (remove extension)
            const title = file.name.split('.').slice(0, -1).join('.');

            // Use thumbnailLink for the UI (this is a temporary public link provided by GDrive)
            // Note: These expire, but let's use it for the initial import. 
            // Ideally, we'd cache these or generate our own thumbnails.
            const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200'); // Larger version

            const { error: upsertError } = await supabase
                .from('photos')
                .upsert({
                    library_id: library.id,
                    google_drive_file_id: file.id,
                    title: title,
                    thumbnail_url: thumbnailUrl,
                    status: 'active',
                    price_cents: 500
                }, {
                    onConflict: 'google_drive_file_id'
                });

            if (upsertError) {
                console.error(`❌ Failed to sync ${file.name}:`, upsertError.message);
            } else {
                console.log(`✅ Synced: ${file.name}`);
            }
        }

        // 5. Cleanup: Remove photos that are no longer in Google Drive
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
                console.log(`🗑️ Found ${photosToDelete.length} photos to remove...`);
                const { error: deleteError } = await supabase
                    .from('photos')
                    .delete()
                    .in('google_drive_file_id', photosToDelete);

                if (deleteError) {
                    console.error('❌ Failed to clean up old photos:', deleteError.message);
                } else {
                    console.log('✨ Successfully removed deleted photos from database.');
                }
            }
        }

        console.log('✨ Sync complete!');

    } catch (error: any) {
        console.error('💥 Sync failed:', error.message);
    }
}

// Get arguments from CLI
const folderId = process.argv[2] || '1CU3BQTqBP4o8JpNArK5Nk2Th63NQNCML';
const librarySlug = process.argv[3] || 'kattitude-tattoo';

syncFolder(folderId, librarySlug);
