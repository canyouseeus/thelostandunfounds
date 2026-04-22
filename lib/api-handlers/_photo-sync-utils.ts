import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function syncGalleryPhotos(librarySlug: string, limit: number = 1000) {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    const GOOGLE_KEY = (rawKey || '')
        .replace(/\\n/g, '\n')
        .replace(/"/g, '')
        .trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
        console.error('Sync missing credentials:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
            hasEmail: !!GOOGLE_EMAIL,
            emailValue: GOOGLE_EMAIL,
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

    const folderId = library.google_drive_folder_id || library.gdrive_folder_id;

    // 2. Init Google Drive
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_EMAIL,
            private_key: GOOGLE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 3. Pre-fetch venue tags with GPS metadata for auto-tagging
    const { data: venueTags } = await supabase
        .from('tags')
        .select('id, metadata')
        .eq('type', 'venue');

    const venueTagsWithGps = (venueTags || []).filter(
        t => t.metadata?.latitude != null && t.metadata?.longitude != null
    );

    // 4. List files entries
    const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'video/quicktime') and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, mimeType, imageMediaMetadata)',
        pageSize: limit,
    });

    const files = response.data.files || [];

    // 5. Upsert into Supabase
    for (const file of files) {
        if (!file.id || !file.name) continue;

        const title = file.name.split('.').slice(0, -1).join('.');
        const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');

        // --- METADATA NORMALIZATION & DATE PARSING ---
        let metadata = file.imageMediaMetadata || {} as any;
        let finalCreatedAt = file.createdTime || new Date().toISOString();

        // Map camelCase to snake_case for frontend consistency
        if (metadata.cameraMake) metadata.camera_make = metadata.cameraMake;
        if (metadata.cameraModel) metadata.camera_model = metadata.cameraModel;
        if (metadata.focalLength) metadata.focal_length = metadata.focalLength;
        if (metadata.isoSpeed) metadata.iso = metadata.isoSpeed;
        if (metadata.exposureTime) metadata.shutter_speed = metadata.exposureTime;

        // Extract GPS coordinates from imageMediaMetadata.location
        const gpsLocation = metadata.location;
        const latitude: number | null = gpsLocation?.latitude ?? null;
        const longitude: number | null = gpsLocation?.longitude ?? null;

        // Parse capture time
        const captureTimeStr = metadata.time;

        if (captureTimeStr) {
            let captureDate: Date | null = null;

            const stdParse = new Date(captureTimeStr);
            if (!isNaN(stdParse.getTime())) {
                captureDate = stdParse;
            } else {
                const parts = captureTimeStr.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (parts) {
                    captureDate = new Date(Date.UTC(
                        parseInt(parts[1]),
                        parseInt(parts[2]) - 1,
                        parseInt(parts[3]),
                        parseInt(parts[4]),
                        parseInt(parts[5]),
                        parseInt(parts[6])
                    ));

                    if (isNaN(captureDate.getTime())) {
                        captureDate = new Date(
                            parseInt(parts[1]),
                            parseInt(parts[2]) - 1,
                            parseInt(parts[3]),
                            parseInt(parts[4]),
                            parseInt(parts[5]),
                            parseInt(parts[6])
                        );
                    }
                }
            }

            if (captureDate && !isNaN(captureDate.getTime())) {
                const uploadDate = new Date(finalCreatedAt);
                if (captureDate.getFullYear() === 2025 && uploadDate.getFullYear() === 2026) {
                    captureDate.setFullYear(2026);
                    metadata._corrected = true;
                }

                metadata.time = captureDate.toISOString();
                metadata.date_taken = captureDate.toISOString();
                finalCreatedAt = captureDate.toISOString();
            }
        }

        // Ensure date_taken is always set (fallback to Drive's createdTime for EXIF-less photos)
        if (!metadata.date_taken) {
            metadata.date_taken = file.createdTime || new Date().toISOString();
        }

        // ----------------------------------------

        const { data: upsertedPhoto } = await supabase
            .from('photos')
            .upsert({
                library_id: library.id,
                google_drive_file_id: file.id,
                title: title,
                thumbnail_url: thumbnailUrl,
                status: 'active',
                mime_type: file.mimeType,
                created_at: finalCreatedAt,
                metadata: metadata,
                latitude,
                longitude,
            }, {
                onConflict: 'google_drive_file_id'
            })
            .select('id')
            .single();

        // Auto-tag with nearby venue tags if photo has GPS coords
        if (latitude != null && longitude != null && upsertedPhoto?.id && venueTagsWithGps.length > 0) {
            const nearbyVenueTags = venueTagsWithGps.filter(tag => {
                const dist = haversineMeters(latitude, longitude, tag.metadata.latitude, tag.metadata.longitude);
                const radius = tag.metadata.radius_meters || 300;
                return dist <= radius;
            });

            if (nearbyVenueTags.length > 0) {
                const tagRows = nearbyVenueTags.map(tag => ({
                    photo_id: upsertedPhoto.id,
                    tag_id: tag.id,
                }));
                await supabase
                    .from('photo_tags')
                    .upsert(tagRows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });
            }
        }
    }

    // 6. Cleanup
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
