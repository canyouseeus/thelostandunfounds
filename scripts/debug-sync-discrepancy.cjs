const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

const FOLDER_ID = '12-LAiVzOMvUuHA87Kq8eJIlYSrHxNpnT'; // LAST NIGHT
const LIBRARY_ID = '6d78991a-f350-4221-9fb1-ede0e8a1c552';

async function debug() {
    console.log('--- Sync Debug Diagnostic ---');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: GOOGLE_EMAIL, private_key: GOOGLE_KEY },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Get Google Drive Files
    console.log('Fetching Google Drive files...');
    const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 1000,
    });
    const driveFiles = response.data.files || [];
    console.log(`Google Drive reported ${driveFiles.length} total objects.`);

    // 2. Filter for images/videos
    const driveMediaFiles = driveFiles.filter(f =>
        f.mimeType.startsWith('image/') ||
        f.mimeType === 'video/quicktime' ||
        f.mimeType === 'video/mp4'
    );
    console.log(`Google Drive has ${driveMediaFiles.length} media files.`);

    // 3. Get DB Photos
    console.log('Fetching database photos...');
    const { data: dbPhotos } = await supabase
        .from('photos')
        .select('google_drive_file_id, title')
        .eq('library_id', LIBRARY_ID);

    console.log(`Database has ${dbPhotos.length} photos for this library.`);

    const dbIdSet = new Set(dbPhotos.map(p => p.google_drive_file_id));

    // 4. Find Missing
    const missingInDb = driveMediaFiles.filter(f => !dbIdSet.has(f.id));
    console.log(`\nFound ${missingInDb.length} files in Drive that are MISSING in DB:`);
    missingInDb.forEach((f, i) => {
        if (i < 10) console.log(` - ${f.name} (${f.id}) [${f.mimeType}]`);
    });
    if (missingInDb.length > 10) console.log(` ... and ${missingInDb.length - 10} more.`);

    // 5. Check if they exist in OTHER libraries
    if (missingInDb.length > 0) {
        console.log('\nChecking if missing IDs exist in other libraries...');
        const missingIds = missingInDb.map(f => f.id);
        const { data: otherLibPhotos } = await supabase
            .from('photos')
            .select('google_drive_file_id, library_id')
            .in('google_drive_file_id', missingIds);

        if (otherLibPhotos && otherLibPhotos.length > 0) {
            console.log(`Found ${otherLibPhotos.length} files in OTHER libraries!`);
            otherLibPhotos.forEach(p => console.log(` - File ${p.google_drive_file_id} is in Lib ID: ${p.library_id}`));
        } else {
            console.log('No overlaps found in other libraries.');
        }
    }
}

debug().catch(console.error);
