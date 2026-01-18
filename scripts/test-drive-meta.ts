
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

if (!rawEmail || !rawKey) {
    console.error('Missing Google Credentials');
    process.exit(1);
}

const GOOGLE_EMAIL = rawEmail.replace(/[^a-zA-Z0-9@._-]/g, '');
const GOOGLE_KEY = rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

async function testDrive() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_EMAIL,
                private_key: GOOGLE_KEY,
            },
            scopes: SCOPES,
        });

        const drive = google.drive({ version: 'v3', auth });
        const folderId = '12-LAiVzOMvUuHA87Kq8eJIlYSrHxNpnT'; // Last Night folder

        console.log(`Listing files in folder: ${folderId}`);
        const res = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, createdTime, imageMediaMetadata)',
            pageSize: 5,
        });

        const files = res.data.files;
        if (files && files.length > 0) {
            console.log('Files found:');
            files.forEach(f => {
                console.log('--- FILE ---');
                console.log(`Name: ${f.name}`);
                console.log(`ID: ${f.id}`);
                console.log(`CreatedTime: ${f.createdTime}`);
                console.log('Metadata:', JSON.stringify(f.imageMediaMetadata, null, 2));
            });
        } else {
            console.log('No files found.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

testDrive();
