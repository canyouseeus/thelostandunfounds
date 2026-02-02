
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testFetchDownload() {
    console.log('--- TEST FETCH DOWNLOAD ---');

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const fileId = '1-jTi1G49wBNDcXjMSLlQenajwCpYAV0H'; // From previous test

    if (!clientEmail || !privateKey) {
        console.error('Missing credentials');
        return;
    }

    const auth = new GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    try {
        console.log('Getting access token...');
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        console.log('✅ Access Token obtained');

        console.log('Fetching file stream...');
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken.token}`
            }
        });

        console.log('Response Status:', driveRes.status);
        console.log('Content-Type:', driveRes.headers.get('content-type'));

        if (!driveRes.ok) {
            console.error('Error:', await driveRes.text());
        } else {
            console.log('✅ Download stream working!');
            // Log first 10 bytes just to prove it
            const buffer = await driveRes.arrayBuffer();
            console.log('First 10 bytes:', new Uint8Array(buffer).slice(0, 10));
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

testFetchDownload();
