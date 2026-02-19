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

// === UPLOAD HISTORY LOGIC ===
const HISTORY_FILE = path.join(__dirname, 'upload-history.json');
const HISTORY_RETENTION_DAYS = 30;
const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

interface UploadHistory {
    [fileName: string]: number; // timestamp
}

let uploadHistory: UploadHistory = {};

function loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            uploadHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));

            // Prune old entries
            const now = Date.now();
            let scanned = 0;
            let pruned = 0;
            for (const [name, timestamp] of Object.entries(uploadHistory)) {
                scanned++;
                if (now - timestamp > HISTORY_RETENTION_MS) {
                    delete uploadHistory[name];
                    pruned++;
                }
            }
            if (pruned > 0) {
                console.log(`Pruned ${pruned} old entries from history (scanned ${scanned}).`);
                saveHistory();
            } else {
                console.log(`Loaded history with ${scanned} entries.`);
            }

        } catch (e) {
            console.error('Failed to parse upload history, starting fresh.');
            uploadHistory = {};
        }
    }
}

function saveHistory() {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(uploadHistory, null, 2));
    } catch (e) {
        console.error('Failed to save upload history:', e);
    }
}

function addToHistory(fileName: string) {
    uploadHistory[fileName] = Date.now();
    saveHistory();
}

function isInHistory(fileName: string): boolean {
    return !!uploadHistory[fileName];
}
// ============================

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

async function uploadFile(filePath: string, parentId: string, retryCount = 0): Promise<boolean> {
    const fileName = path.basename(filePath);
    const MAX_RETRIES = 5; // Increased retries
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // 0. Check History (Local Cache)
    if (isInHistory(fileName)) {
        console.log(`Skipping ${fileName} (found in local 3-day history)`);
        return true;
    }

    // Check if file already exists globally (only on first try)
    if (retryCount === 0) {
        const existing = await findGlobalFile(fileName, fileSize);
        if (existing) {
            console.log(`Skipping ${fileName} (already exists in Drive, ID: ${existing.id})`);
            addToHistory(fileName); // Add to history so next time we skip local check
            return true;
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
        addToHistory(fileName); // <--- Add to history on success
        return true;
    } catch (err: any) {
        process.stdout.write('\n'); // Ensure error is on new line
        console.error(`Error uploading ${fileName}:`, err.message);

        if (retryCount < MAX_RETRIES) {
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const delay = Math.pow(2, retryCount + 1) * 1000;
            console.log(`Retrying upload for ${fileName} in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return uploadFile(filePath, parentId, retryCount + 1);
        } else {
            console.error(`Failed to upload ${fileName} after ${MAX_RETRIES} retries.`);
            return false;
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
    loadHistory();
    const failedUploads: { filePath: string, parentId: string }[] = [];

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

    // 3. Import from SD Card (if detected)
    if (USE_SD_CARD) {
        console.log('\n=== Importing from SD Card ===');
        const allFiles = getFilesRecursive(SD_CARD_PATH);
        console.log(`Found ${allFiles.length} files on SD card. Processing sequentially by type...`);

        // Define processing order: JPG, RAW, MOV
        const processingOrder: { type: 'JPG' | 'RAW' | 'MOV', ext: string[] }[] = [
            { type: 'JPG', ext: ['.jpg', '.jpeg'] },
            { type: 'RAW', ext: ['.raf'] },
            { type: 'MOV', ext: ['.mov', '.mp4'] }
        ];

        for (const group of processingOrder) {
            console.log(`\nImporting ${group.type} files...`);
            const targetConfig = FOLDER_CONFIG[group.type as keyof typeof FOLDER_CONFIG];

            // Ensure target directory exists
            if (!fs.existsSync(targetConfig.local)) {
                fs.mkdirSync(targetConfig.local, { recursive: true });
            }

            const filesToCopy = allFiles.filter(f => group.ext.includes(path.extname(f).toLowerCase()));

            if (filesToCopy.length === 0) {
                console.log(`No ${group.type} files found.`);
                continue;
            }

            console.log(`Found ${filesToCopy.length} ${group.type} files.`);

            for (const srcPath of filesToCopy) {
                const fileName = path.basename(srcPath);
                const destPath = path.join(targetConfig.local, fileName);

                if (fs.existsSync(destPath)) {
                    // console.log(`Skipping ${fileName} (already imported)`);
                    continue;
                }

                try {
                    const fileSize = fs.statSync(srcPath).size;
                    console.log(`Copying ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);
                    fs.copyFileSync(srcPath, destPath);
                } catch (err: any) {
                    console.error(`Error copying ${fileName}: ${err.message}`);
                }
            }
        }
        console.log('\n✅ Import complete.');
    }

    // 4. Upload from Desktop (Standard Logic)
    console.log('\n=== Starting Uploads from Desktop ===');

    // Process ALL types (JPG, RAW, MOV)
    const ENABLED_TYPES = ['JPG', 'RAW', 'MOV'] as const;

    for (const type of ENABLED_TYPES) {
        const config = FOLDER_CONFIG[type];
        console.log(`\nProcessing ${type} folder...`);

        if (fs.existsSync(config.local)) {
            try {
                const targetFolderId = await getOrCreateFolder('NEW UPLOADS', config.parent!);
                if (targetFolderId) {
                    const files = fs.readdirSync(config.local).filter(f => !f.startsWith('.'));
                    if (files.length > 0) {
                        for (const file of files) {
                            const filePath = path.join(config.local, file);
                            try {
                                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                                    const success = await uploadFile(filePath, targetFolderId);
                                    if (!success) {
                                        failedUploads.push({ filePath, parentId: targetFolderId });
                                    }
                                }
                            } catch (loopErr: any) {
                                console.error(`Warning: Skipping ${file} due to error: ${loopErr.message}`);
                            }
                        }
                    } else {
                        console.log(`No files to upload in ${config.local}`);
                    }
                }
            } catch (err: any) {
                console.error(`Error processing uploads for ${type}: ${err.message}`);
            }
        } else {
            console.log(`Local folder ${config.local} does not exist. Skipping.`);
        }
    }

    // 5. Retry Failed Uploads
    if (failedUploads.length > 0) {
        console.log(`\n=== ⚠️ Retrying ${failedUploads.length} Failed Uploads ===`);
        for (const item of failedUploads) {
            console.log(`\nRe-attempting ${path.basename(item.filePath)}...`);
            await uploadFile(item.filePath, item.parentId);
        }
    } else {
        console.log('\n=== ✅ All Uploads Successful ===');
    }
}

startSync().catch(console.error);
