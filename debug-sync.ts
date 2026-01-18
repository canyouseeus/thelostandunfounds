import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncGalleryPhotos } from './lib/api-handlers/_photo-sync-utils.ts';

async function debugSync() {
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sanitizedEmail = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');

    console.log('--- SYNC DEBUG ---');
    console.log('Raw Email in Env:', JSON.stringify(rawEmail));
    console.log('Sanitized Email:', sanitizedEmail);
    console.log('Testing sync for "last-night"...');

    try {
        // The utility reads from process.env internally
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = sanitizedEmail;

        const result = await syncGalleryPhotos('last-night');
        console.log('Sync Result:', result);

    } catch (err: any) {
        console.error('Sync failed:', err.message);
    }
}

debugSync();
