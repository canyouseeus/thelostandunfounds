// Batch photo-editing operations for the admin Gallery Management panel.
// Every write here goes through the service-role Supabase client and, where
// relevant, the Google Drive API — this is the "home base" that keeps the
// website and Drive in sync when the admin edits tags, location, folder, or
// deletes photos from the fullscreen gallery grid.
import type { VercelRequest } from '@vercel/node';
import { createServiceSupabaseClient, type ServiceSupabaseClient } from './_supabase-admin-client.js';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

export async function requireAdminUser(req: VercelRequest) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const supabase = createServiceSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    return user && ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ? user : null;
}

function getGoogleCreds() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '').trim();
    if (!email || !key) throw new Error('Google Drive credentials are not configured');
    return { email, key };
}

// Full (non-readonly) scope — required to trash/move files, unlike the
// drive.readonly scope used elsewhere for listing/streaming.
async function getWriteDriveClient() {
    const { google } = await import('googleapis');
    const { email, key } = getGoogleCreds();
    const auth = new google.auth.JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
}

export interface DriveOpError {
    fileId: string;
    error: string;
}

// Moves a file to Drive's trash — the same result as clicking Delete in the
// Drive UI. Only requires Editor access to the file's folder (not ownership),
// and is recoverable, unlike a permanent purge.
export async function trashDriveFile(fileId: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const drive = await getWriteDriveClient();
        await drive.files.update({ fileId, requestBody: { trashed: true } });
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Unknown Drive error' };
    }
}

// Moves a file between Drive folders by swapping parents. Reads the file's
// current parents first rather than trusting the DB's notion of "current
// folder", since photos can live in subfolders the sync pipeline created.
export async function moveDriveFile(fileId: string, newParentId: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const drive = await getWriteDriveClient();
        const { data: file } = await drive.files.get({ fileId, fields: 'parents' });
        const previousParents = (file.parents || []).join(',');
        await drive.files.update({
            fileId,
            addParents: newParentId,
            removeParents: previousParents,
            fields: 'id, parents',
        });
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Unknown Drive error' };
    }
}

export async function batchAddTags(supabase: ServiceSupabaseClient, photoIds: string[], tagIds: string[]) {
    const rows = photoIds.flatMap(photoId => tagIds.map(tagId => ({ photo_id: photoId, tag_id: tagId })));
    const { error } = await supabase.from('photo_tags').upsert(rows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });
    if (error) throw error;
    return { count: rows.length };
}

export async function batchRemoveTags(supabase: ServiceSupabaseClient, photoIds: string[], tagIds: string[]) {
    const { error } = await supabase.from('photo_tags').delete().in('photo_id', photoIds).in('tag_id', tagIds);
    if (error) throw error;
    return { count: photoIds.length * tagIds.length };
}

export async function batchSetLocation(
    supabase: ServiceSupabaseClient,
    photoIds: string[],
    location: { latitude: number | null; longitude: number | null; location_name: string | null }
) {
    const { error } = await supabase
        .from('photos')
        .update({
            latitude: location.latitude,
            longitude: location.longitude,
            location_name: location.location_name,
        })
        .in('id', photoIds);
    if (error) throw error;
    return { count: photoIds.length };
}

export async function batchMovePhotos(supabase: ServiceSupabaseClient, photoIds: string[], targetLibraryId: string) {
    const { data: targetLibrary, error: libError } = await supabase
        .from('photo_libraries')
        .select('id, google_drive_folder_id, gdrive_folder_id')
        .eq('id', targetLibraryId)
        .single();
    if (libError || !targetLibrary) throw new Error('Target gallery not found');
    const targetFolderId = targetLibrary.google_drive_folder_id || targetLibrary.gdrive_folder_id;

    const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, google_drive_file_id')
        .in('id', photoIds);
    if (photosError) throw photosError;

    const driveErrors: DriveOpError[] = [];
    if (targetFolderId) {
        for (const photo of photos || []) {
            if (!photo.google_drive_file_id) continue;
            const result = await moveDriveFile(photo.google_drive_file_id, targetFolderId);
            if (!result.ok) driveErrors.push({ fileId: photo.google_drive_file_id, error: result.error || 'Move failed' });
        }
    }

    const { error: updateError } = await supabase
        .from('photos')
        .update({ library_id: targetLibraryId })
        .in('id', photoIds);
    if (updateError) throw updateError;

    return { moved: photoIds.length, driveErrors };
}

export async function batchDeletePhotos(supabase: ServiceSupabaseClient, photoIds: string[]) {
    const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select('id, google_drive_file_id')
        .in('id', photoIds);
    if (photosError) throw photosError;

    const driveErrors: DriveOpError[] = [];
    for (const photo of photos || []) {
        if (!photo.google_drive_file_id) continue;
        const result = await trashDriveFile(photo.google_drive_file_id);
        if (!result.ok) driveErrors.push({ fileId: photo.google_drive_file_id, error: result.error || 'Trash failed' });
    }

    await supabase.from('photo_tags').delete().in('photo_id', photoIds);
    const { error: deleteError } = await supabase.from('photos').delete().in('id', photoIds);
    if (deleteError) throw deleteError;

    return { deleted: photoIds.length, driveErrors };
}

// Downloads analytics — reads photo_download_events via service role since
// the table's only RLS policy is scoped to service_role (by design, it holds
// emails + IPs). The admin panel previously queried this with the anon
// client and silently got zero rows back from every query.
export async function getDownloadsData(supabase: ServiceSupabaseClient) {
    const { data: recent } = await supabase
        .from('photo_download_events')
        .select('id, photo_id, google_drive_file_id, email, ip_address, user_agent, source, created_at, photos(title, thumbnail_url)')
        .order('created_at', { ascending: false })
        .limit(50);

    const now = Date.now();
    const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: all }, { count: last7 }, { count: last30 }] = await Promise.all([
        supabase.from('photo_download_events').select('*', { count: 'exact', head: true }),
        supabase.from('photo_download_events').select('*', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('photo_download_events').select('*', { count: 'exact', head: true }).gte('created_at', d30),
    ]);

    const { data: agg } = await supabase
        .from('photo_download_events')
        .select('photo_id, created_at, photos(title, thumbnail_url)')
        .not('photo_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000);

    const map = new Map<string, { photo_id: string; title: string; thumbnail_url: string | null; download_count: number; last_download_at: string }>();
    for (const row of (agg || []) as any[]) {
        if (!row.photo_id) continue;
        const existing = map.get(row.photo_id);
        if (existing) {
            existing.download_count++;
        } else {
            map.set(row.photo_id, {
                photo_id: row.photo_id,
                title: row.photos?.title || 'Untitled',
                thumbnail_url: row.photos?.thumbnail_url || null,
                download_count: 1,
                last_download_at: row.created_at,
            });
        }
    }
    const aggregates = [...map.values()].sort((a, b) => b.download_count - a.download_count).slice(0, 50);

    return {
        events: recent || [],
        aggregates,
        totals: { all: all ?? 0, last7: last7 ?? 0, last30: last30 ?? 0 },
    };
}
