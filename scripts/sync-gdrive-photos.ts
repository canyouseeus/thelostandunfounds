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

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

async function ensureCollectionTag(subfolderName: string): Promise<string> {
    const slug = `collection-${slugify(subfolderName)}`;

    const { data: existing } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', slug)
        .single();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
        .from('tags')
        .insert({ name: subfolderName, type: 'collection', slug })
        .select('id')
        .single();

    if (error) throw new Error(`Failed to create collection tag for "${subfolderName}": ${error.message}`);
    console.log(`🏷️  Created collection tag: ${subfolderName}`);
    return created.id;
}

async function applyTagToPhotos(driveFileIds: string[], tagId: string): Promise<void> {
    if (driveFileIds.length === 0) return;

    // Resolve Google Drive file IDs → Supabase photo IDs
    const { data: photos } = await supabase
        .from('photos')
        .select('id')
        .in('google_drive_file_id', driveFileIds);

    if (!photos || photos.length === 0) return;

    const tagRows = photos.map(p => ({ photo_id: p.id, tag_id: tagId }));
    await supabase
        .from('photo_tags')
        .upsert(tagRows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });
}

async function syncFilesFromFolder(
    drive: ReturnType<typeof google.drive>,
    folderId: string,
    libraryId: string,
    collectionTagId: string | null
): Promise<string[]> {
    const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'video/quicktime') and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, mimeType, imageMediaMetadata)',
        pageSize: 1000,
    });

    const files = response.data.files || [];
    console.log(`📸 Found ${files.length} media files.`);

    for (const file of files) {
        if (!file.id || !file.name) continue;

        const title = file.name.split('.').slice(0, -1).join('.');
        const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');
        const metadata: any = file.imageMediaMetadata || {};

        // Normalize EXIF fields
        if (metadata.cameraMake) metadata.camera_make = metadata.cameraMake;
        if (metadata.cameraModel) metadata.camera_model = metadata.cameraModel;
        if (metadata.focalLength) metadata.focal_length = metadata.focalLength;
        if (metadata.isoSpeed) metadata.iso = metadata.isoSpeed;
        if (metadata.exposureTime) metadata.shutter_speed = metadata.exposureTime;

        // Extract GPS
        const gpsLocation = metadata.location;
        const latitude: number | null = gpsLocation?.latitude ?? null;
        const longitude: number | null = gpsLocation?.longitude ?? null;

        const { error: upsertError } = await supabase
            .from('photos')
            .upsert({
                library_id: libraryId,
                google_drive_file_id: file.id,
                title,
                thumbnail_url: thumbnailUrl,
                status: 'active',
                mime_type: file.mimeType,
                created_at: file.createdTime || new Date().toISOString(),
                metadata,
                latitude,
                longitude,
            }, {
                onConflict: 'google_drive_file_id'
            });

        if (upsertError) {
            console.error(`❌ Failed to sync ${file.name}:`, upsertError.message);
        } else {
            console.log(`✅ Synced: ${file.name}${latitude != null ? ` (📍 ${latitude.toFixed(4)}, ${longitude!.toFixed(4)})` : ''}`);
        }
    }

    // Apply collection tag to all synced photos
    if (collectionTagId && files.length > 0) {
        const fileIds = files.map(f => f.id).filter(Boolean) as string[];
        await applyTagToPhotos(fileIds, collectionTagId);
        console.log(`🏷️  Applied collection tag to ${fileIds.length} photos.`);
    }

    return files.map(f => f.id).filter(Boolean) as string[];
}

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
            credentials: { client_email: GOOGLE_EMAIL, private_key: GOOGLE_KEY },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 3. List subfolders in root folder
        const subfolderResponse = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 100,
        });

        const subfolders = subfolderResponse.data.files || [];
        console.log(`📁 Found ${subfolders.length} subfolders.`);

        const allSyncedFileIds: string[] = [];

        // 4. Sync photos directly in root folder (no collection tag)
        console.log(`\n📂 Syncing root folder files...`);
        const rootFileIds = await syncFilesFromFolder(drive, folderId, library.id, null);
        allSyncedFileIds.push(...rootFileIds);

        // 5. Sync each subfolder and create/apply collection tags
        for (const subfolder of subfolders) {
            if (!subfolder.id || !subfolder.name) continue;
            console.log(`\n📂 Syncing subfolder: ${subfolder.name}`);

            const collectionTagId = await ensureCollectionTag(subfolder.name);
            const subFileIds = await syncFilesFromFolder(drive, subfolder.id, library.id, collectionTagId);
            allSyncedFileIds.push(...subFileIds);
        }

        // 6. Cleanup: Remove photos that are no longer in Google Drive
        const currentDriveFileIds = new Set(allSyncedFileIds);

        const { data: existingPhotos } = await supabase
            .from('photos')
            .select('google_drive_file_id')
            .eq('library_id', library.id);

        if (existingPhotos) {
            const photosToDelete = existingPhotos
                .filter(p => p.google_drive_file_id && !currentDriveFileIds.has(p.google_drive_file_id))
                .map(p => p.google_drive_file_id);

            if (photosToDelete.length > 0) {
                console.log(`\n🗑️  Found ${photosToDelete.length} photos to remove...`);
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

        console.log(`\n✨ Sync complete! Total synced: ${allSyncedFileIds.length}`);

    } catch (error: any) {
        console.error('💥 Sync failed:', error.message);
        process.exit(1);
    }
}

// Get arguments from CLI
const folderId = process.argv[2] || '1CU3BQTqBP4o8JpNArK5Nk2Th63NQNCML';
const librarySlug = process.argv[3] || 'kattitude-tattoo';

syncFolder(folderId, librarySlug);
