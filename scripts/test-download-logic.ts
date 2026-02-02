
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testDownload() {
    console.log('--- START TEST DOWNLOAD ---');

    // 1. Get an entitlement for the order
    const orderId = '68bf7483-4f37-40d8-b5df-3285931f5ed8';

    const { data: entitlements, error } = await supabase
        .from('photo_entitlements')
        .select('*, photos(google_drive_file_id, title)')
        .eq('order_id', orderId)
        .limit(1);

    if (error || !entitlements || entitlements.length === 0) {
        console.error('Failed to find entitlements:', error);
        return;
    }

    const entitlement = entitlements[0];
    console.log('Found Entitlement:', entitlement.token);
    console.log('Photo ID:', entitlement.photo_id);
    console.log('Google Drive File ID:', (entitlement.photos as any).google_drive_file_id);

    // 2. Simulate Google Drive access
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('Google Service Account Email:', clientEmail);
    console.log('Private Key Length:', privateKey?.length);

    if (!clientEmail || !privateKey) {
        console.error('Missing Google Credentials');
        return;
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    try {
        const drive = google.drive({ version: 'v3', auth });
        const fileId = (entitlement.photos as any).google_drive_file_id;

        console.log(`Attempting to fetch file metadata for ID: ${fileId}...`);

        const metadata = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size'
        });

        console.log('✅ File Metadata:', metadata.data);

        console.log('Attempting to download file stream...');
        const driveResponse = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        console.log('✅ Stream obtained. Status:', driveResponse.status);

        // Try reading a chunk
        const stream = driveResponse.data as any;
        let chunkCount = 0;
        stream.on('data', (chunk: any) => {
            chunkCount++;
            if (chunkCount === 1) {
                console.log(`Received first chunk of size: ${chunk.length}`);
                stream.destroy(); // Stop download
            }
        });

        stream.on('error', (err: any) => {
            console.error('Stream Error:', err);
        });

        stream.on('end', () => {
            console.log('Stream ended');
        });

    } catch (gErr: any) {
        console.error('❌ Google Drive API Error:', gErr.message);
        if (gErr.response) {
            console.error('Error Details:', JSON.stringify(gErr.response.data, null, 2));
        }
    }
}

testDownload();
