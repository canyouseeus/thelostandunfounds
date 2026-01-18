require('dotenv').config({ path: '.env.local' });
const { syncGalleryPhotos } = require('./lib/api-handlers/_photo-sync-utils');

async function debugSync() {
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sanitizedEmail = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');

    console.log('--- SYNC DEBUG ---');
    console.log('Raw Email in Env:', JSON.stringify(rawEmail));
    console.log('Sanitized Email:', sanitizedEmail);
    console.log('Testing sync for "last-night"...');

    try {
        // Need to make sure the environment variables are available for the utility
        // The utility reads from process.env internally
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = sanitizedEmail;

        const result = await syncGalleryPhotos('last-night');
        console.log('Sync Result:', result);
    } catch (err) {
        console.error('Sync failed:', err.message);
        if (err.message.includes('Library not found')) {
            console.log('Wait, check the slug in DB.');
        }
    }
}

debugSync();
