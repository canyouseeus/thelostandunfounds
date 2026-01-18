import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from the root .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Missing OAuth2 credentials in .env.local');
    console.error('Run: npx tsx scripts/setup-google-oauth.ts');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const FOLDER_CONFIG = {
    JPG: {
        parent: '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4',
        local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'jpg')
    },
    RAW: {
        parent: '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV',
        local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'raf')
    },
    MOV: {
        parent: '13yWZiOr6UpDhS1VDtKVonx441O137Lc-',
        local: path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'mov')
    }
};

async function getOrCreateFolder(name: string, parentId: string) {
    const res = await drive.files.list({
        q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const folder = await drive.files.create({
        requestBody: {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
    });

    return folder.data.id;
}

async function uploadFile(filePath: string, parentId: string) {
    const fileName = path.basename(filePath);
    console.log(`Uploading ${fileName}...`);

    try {
        await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [parentId],
            },
            media: {
                body: fs.createReadStream(filePath),
            },
        });
        console.log(`Successfully uploaded ${fileName}`);
    } catch (err: any) {
        console.error(`Error uploading ${fileName}:`, err.message);
    }
}

async function startSync() {
    for (const [key, config] of Object.entries(FOLDER_CONFIG)) {
        console.log(`\nProcessing ${key} folder...`);

        if (!fs.existsSync(config.local)) {
            console.log(`Local folder ${config.local} does not exist. Skipping.`);
            continue;
        }

        const targetFolderId = await getOrCreateFolder('NEW UPLOADS', config.parent!);
        if (!targetFolderId) {
            console.error(`Could not find or create NEW UPLOADS folder in ${key} parent.`);
            continue;
        }

        const files = fs.readdirSync(config.local).filter(f => !f.startsWith('.'));

        if (files.length === 0) {
            console.log(`No files to upload in ${config.local}`);
            continue;
        }

        for (const file of files) {
            const filePath = path.join(config.local, file);
            if (fs.statSync(filePath).isFile()) {
                await uploadFile(filePath, targetFolderId);
            }
        }
    }
}

startSync().catch(console.error);
