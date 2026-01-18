
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDB() {
    console.log('Checking DB...');

    // 1. Check Libraries
    const { data: libraries, error: libError } = await supabase
        .from('photo_libraries')
        .select('*');

    if (libError) {
        console.error('Error fetching libraries:', libError);
    } else {
        console.log(`Found ${libraries?.length} libraries:`);
        libraries?.forEach(lib => {
            console.log(` - [${lib.id}] ${lib.name} (slug: ${lib.slug}) | Private: ${lib.is_private} | GoogleFolder: ${lib.google_drive_folder_id}`);
        });
    }

    // 2. Check Photos
    const { count, error: countError } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting photos:', countError);
    } else {
        console.log(`Total photos in DB: ${count}`);
    }

    // 3. Check specific library photos (Last Night)
    if (libraries) {
        const lastNight = libraries.find(l => l.slug === 'last-night');
        if (lastNight) {
            const { data: photos, error: photosError } = await supabase
                .from('photos')
                .select('id, created_at, metadata')
                .eq('library_id', lastNight.id)
                .limit(5);

            if (photosError) {
                console.error('Error fetching Last Night photos:', photosError);
            } else {
                console.log(`Sample photos from 'last-night':`);
                photos?.forEach(p => {
                    console.log(` - ID: ${p.id}, Created: ${p.created_at}, TimeMeta: ${p.metadata?.time || 'N/A'}, DateTakenMeta: ${p.metadata?.date_taken || 'N/A'}`);
                });
            }
        }
    }
}

checkDB();
