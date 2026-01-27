
import { syncGalleryPhotos } from '../lib/api-handlers/_photo-sync-utils';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runSync() {
    console.log('Starting Force Sync for "last-night"...');
    try {
        const result = await syncGalleryPhotos('last-night');
        console.log('Sync Complete:', result);
    } catch (err) {
        console.error('Sync Failed:', err);
    }
}

runSync();
