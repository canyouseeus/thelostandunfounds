import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env vars same way as the API
console.log('Loading .env.local...');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
console.log('Loading .env...');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const checkCredentials = async () => {
    console.log('\n--- Checking Environment Variables ---');

    // 1. Check Supabase
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (SUPABASE_URL) console.log('✅ SUPABASE_URL: Present');
    else console.error('❌ SUPABASE_URL: Missing');

    if (SUPABASE_KEY) console.log('✅ SUPABASE_SERVICE_ROLE_KEY: Present');
    else console.error('❌ SUPABASE_SERVICE_ROLE_KEY: Missing');

    // 2. Check Google
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (rawEmail) console.log('✅ GOOGLE_SERVICE_ACCOUNT_EMAIL: Present');
    else console.error('❌ GOOGLE_SERVICE_ACCOUNT_EMAIL: Missing');

    if (rawKey) {
        console.log('✅ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: Present');
        console.log(`   Length: ${rawKey.length}`);
        console.log(`   Has \\n literals: ${rawKey.includes('\\n')}`);
        console.log(`   Has real newlines: ${rawKey.includes('\n')}`);

        // Simulating the API's key processing logic
        let processedKey = rawKey;
        if (processedKey.includes('\\n')) {
            processedKey = processedKey.replace(/\\n/g, '\n');
        }
        processedKey = processedKey.replace(/"/g, '').trim();

        console.log('   --- After Processing ---');
        console.log(`   Starts with header: ${processedKey.startsWith('-----BEGIN PRIVATE KEY-----')}`);
        console.log(`   Ends with footer: ${processedKey.endsWith('-----END PRIVATE KEY-----')}`);
        const newlineCount = (processedKey.match(/\n/g) || []).length;
        console.log(`   Newline count: ${newlineCount} (Should be > 20 typicaly)`);

        if (!processedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
            console.error('❌ Key format error: Does not start with -----BEGIN PRIVATE KEY-----');
        }
    } else {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: Missing');
    }

    // 3. Try connecting to Supabase if possible
    if (SUPABASE_URL && SUPABASE_KEY) {
        console.log('\n--- Testing Supabase Connection ---');
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            const { data, error } = await supabase.from('photo_libraries').select('count').limit(1);
            if (error) {
                console.error('❌ Supabase Connection Failed:', error.message);
            } else {
                console.log('✅ Supabase Connection Successful');
            }
        } catch (err: any) {
            console.error('❌ Supabase Exception:', err.message);
        }
    }

    // 4. Try connecting to Google Drive
    if (rawEmail && rawKey) {
        console.log('\n--- Testing Google Drive Connection ---');
        try {
            const { google } = await import('googleapis');

            let GOOGLE_KEY = rawKey;
            if (GOOGLE_KEY.includes('\\n')) {
                GOOGLE_KEY = GOOGLE_KEY.replace(/\\n/g, '\n');
            }
            GOOGLE_KEY = GOOGLE_KEY.replace(/"/g, '').trim();

            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: rawEmail,
                    private_key: GOOGLE_KEY,
                },
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });

            const drive = google.drive({ version: 'v3', auth });
            // List 1 file to verify auth
            const response = await drive.files.list({
                pageSize: 1,
                fields: 'files(id, name)',
            });

            console.log('✅ Google Drive Auth Successful');
            console.log(`   Found ${response.data.files?.length ?? 0} files (in root/visible scope)`);
        } catch (err: any) {
            console.error('❌ Google Drive Auth Failed:', err.message);
            if (err.errors) console.error('   Details:', JSON.stringify(err.errors, null, 2));
        }
    }
};

checkCredentials().catch(console.error);
