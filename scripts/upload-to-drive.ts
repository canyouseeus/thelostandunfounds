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

// Helper to retry any async operation
async function retryApiCall<T>(operation: () => Promise<T>, description: string, retries = 5): Promise<T> {
    try {
        return await operation();
    } catch (err: any) {
        if (retries > 0) {
            const delay = Math.pow(2, 6 - retries) * 1000; // 2s, 4s, 8s, 16s, 32s
            console.log(`Error ${description}: ${err.message}. Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryApiCall(operation, description, retries - 1);
        }
        throw err;
    }
}

async function getOrCreateFolder(name: string, parentId: string) {
    return retryApiCall(async () => {
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
    }, `getOrCreateFolder(${name})`);
}

async function findDuplicates(fileName: string, parentId: string) {
    return retryApiCall(async () => {
        const res = await drive.files.list({
            q: `name = '${fileName}' and '${parentId}' in parents and trashed = false`,
            fields: 'files(id, name, createdTime)',
            orderBy: 'createdTime',
        });
        return res.data.files || [];
    }, `findDuplicates(${fileName})`);
}

async function removeDuplicates(fileName: string, parentId: string) {
    const files = await findDuplicates(fileName, parentId);

    if (files.length > 1) {
        console.log(`Found ${files.length} copies of ${fileName}, keeping the oldest and removing ${files.length - 1} duplicate(s)...`);

        // Keep the first (oldest) file, delete the rest
        for (let i = 1; i < files.length; i++) {
            await retryApiCall(async () => {
                await drive.files.delete({ fileId: files[i].id! });
                console.log(`  Removed duplicate: ${files[i].id}`);
            }, `removeDuplicate(${files[i].id})`);
        }
    }
}

async function cleanupDuplicatesInFolder(parentId: string, folderName: string) {
    console.log(`\nScanning ${folderName} for duplicates...`);

    const res = await retryApiCall(async () => {
        return await drive.files.list({
            q: `'${parentId}' in parents and trashed = false`,
            fields: 'files(id, name)',
        });
    }, `listDuplicates(${folderName})`);



    const files = res.data.files || [];
    const fileNames = new Set<string>();
    const duplicates = new Set<string>();

    for (const file of files) {
        if (fileNames.has(file.name!)) {
            duplicates.add(file.name!);
        } else {
            fileNames.add(file.name!);
        }
    }

    if (duplicates.size > 0) {
        console.log(`Found duplicates for ${duplicates.size} file(s), cleaning up...`);
        for (const fileName of duplicates) {
            await removeDuplicates(fileName, parentId);
        }
    } else {
        console.log(`No duplicates found in ${folderName}`);
    }
}

async function findGlobalFile(fileName: string, fileSize: number) {
    return retryApiCall(async () => {
        const res = await drive.files.list({
            q: `name = '${fileName}' and trashed = false`,
            fields: 'files(id, name, size, createdTime, parents)',
            orderBy: 'createdTime desc',
        });

        const files = res.data.files || [];
        // Find a file with matching size
        return files.find(f => f.size && parseInt(f.size) === fileSize);
    }, `findGlobalFile(${fileName})`);
}

async function uploadFile(filePath: string, parentId: string, retryCount = 0) {
    const fileName = path.basename(filePath);
    const MAX_RETRIES = 5; // Increased retries
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Check if file already exists globally (only on first try)
    if (retryCount === 0) {
        const existing = await findGlobalFile(fileName, fileSize);
        if (existing) {
            console.log(`Skipping ${fileName} (already exists in Drive, ID: ${existing.id})`);
            return;
        }
    }

    console.log(`Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)${retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : ''}...`);

    try {
        await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [parentId],
            },
            media: {
                // Use stream for lower memory usage, but create a new stream for each retry
                body: fs.createReadStream(filePath),
            },
        }, {
            // Enable resumable uploads for better reliability with large files
            onUploadProgress: (evt) => {
                const progress = (evt.bytesRead / fileSize) * 100;
                process.stdout.write(`\rUploading ${fileName}: ${progress.toFixed(0)}%`);
            },
        });
        process.stdout.write('\n'); // New line after progress bar
        console.log(`Successfully uploaded ${fileName}`);
    } catch (err: any) {
        process.stdout.write('\n'); // Ensure error is on new line
        console.error(`Error uploading ${fileName}:`, err.message);

        if (retryCount < MAX_RETRIES) {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const delay = Math.pow(2, retryCount + 1) * 1000;
            console.log(`Retrying upload for ${fileName} in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            await uploadFile(filePath, parentId, retryCount + 1);
        } else {
            console.error(`Failed to upload ${fileName} after ${MAX_RETRIES} retries.`);
        }
    }
}

// Add recursive directory traversal
function getFilesRecursive(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file.startsWith('.')) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursive(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

async function startSync() {
    // 1. Detect Source (SD Card or Desktop)
    const SD_CARD_PATH = '/Volumes/CLAPTROP II/DCIM';
    const USE_SD_CARD = fs.existsSync(SD_CARD_PATH);

    console.log('\n=== Source Detection ===');
    if (USE_SD_CARD) {
        console.log(`✅ SD Card Detected: ${SD_CARD_PATH}`);
    } else {
        console.log('⚠️ SD Card not found. Falling back to Desktop folders.');
    }

    // 2. Clean up existing duplicates (Target Folders)
    console.log('\n=== Cleaning up existing duplicates ===');
    for (const [key, config] of Object.entries(FOLDER_CONFIG)) {
        try {
            const targetFolderId = await getOrCreateFolder('NEW UPLOADS', config.parent!);
            if (targetFolderId) {
                await cleanupDuplicatesInFolder(targetFolderId, `${key} NEW UPLOADS`);
            }
        } catch (err: any) {
            console.error(`Error processing folder ${key}: ${err.message}`);
        }
    }

    // 3. Collect Files to Upload
    console.log('\n=== Scanning Files ===');
    const filesToUpload: { path: string; type: 'JPG' | 'RAW' | 'MOV' }[] = [];

    if (USE_SD_CARD) {
        const allFiles = getFilesRecursive(SD_CARD_PATH);
        console.log(`Found ${allFiles.length} files on SD card.`);

        for (const filePath of allFiles) {
            const ext = path.extname(filePath).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') {
                filesToUpload.push({ path: filePath, type: 'JPG' });
            } else if (ext === '.raf') {
                filesToUpload.push({ path: filePath, type: 'RAW' });
            } else if (ext === '.mov' || ext === '.mp4') {
                filesToUpload.push({ path: filePath, type: 'MOV' });
            }
        }
    } else {
        // Desktop Fallback
        for (const [key, config] of Object.entries(FOLDER_CONFIG)) {
            if (fs.existsSync(config.local)) {
                const files = fs.readdirSync(config.local).filter(f => !f.startsWith('.'));
                for (const file of files) {
                    const filePath = path.join(config.local, file);
                    if (fs.statSync(filePath).isFile()) {
                        filesToUpload.push({ path: filePath, type: key as any });
                    }
                }
            }
        }
    }

    if (filesToUpload.length === 0) {
        console.log('No files found to upload.');
        return;
    }

    console.log(`Prepared ${filesToUpload.length} files for upload.`);

    // 4. Upload Files
    console.log('\n=== Starting Uploads ===');
    for (const file of filesToUpload) {
        const config = FOLDER_CONFIG[file.type];
        try {
            const targetFolderId = await getOrCreateFolder('NEW UPLOADS', config.parent!);
            if (targetFolderId) {
                await uploadFile(file.path, targetFolderId);
            }
        } catch (err: any) {
            console.error(`Error uploading ${file.path}: ${err.message}`);
        }
    }
}

startSync().catch(console.error);
