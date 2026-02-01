
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPricing() {
    const photoId = 'fdeea390-cf65-48fa-bb07-f80b097d74dc';
    console.log(`Checking pricing for photo: ${photoId}`);

    // Check Photo
    const { data: photo, error: err1 } = await supabase
        .from('photos')
        .select('id, price_cents, library_id')
        .eq('id', photoId)
        .single();

    if (photo) {
        console.log('Photo Record:', JSON.stringify(photo, null, 2));

        // Check Library
        const { data: library, error: err2 } = await supabase
            .from('photo_libraries')
            .select('*')
            .eq('id', photo.library_id)
            .single();

        console.log('Library Record:', JSON.stringify(library || err2, null, 2));

        if (library) {
            const { data: pricing } = await supabase
                .from('gallery_pricing_options')
                .select('*')
                .eq('library_id', library.id);
            console.log('Pricing Options:', JSON.stringify(pricing, null, 2));
        }
    } else {
        console.log('Photo not found:', err1);
    }
}

checkPricing();
