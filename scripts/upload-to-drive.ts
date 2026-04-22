import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { buildName, getAvailableBytes, formatBytes, resetSeqs } from './claptrop-namer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
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

// ─── CLI Flags ────────────────────────────────────────────────────────────────

const args              = process.argv.slice(2);
const SKIP_DRIVE        = args.includes('--skip-drive');   // /claptrop-ii
const SUBJECT_OVERRIDE  = (() => { const i = args.indexOf('--subject'); return i !== -1 ? args[i + 1] : undefined; })();
const LOW_DISK_THRESHOLD_GB = 2; // flush local staging when available < 2 GB

// ─── Upload History ───────────────────────────────────────────────────────────

const HISTORY_FILE          = path.join(__dirname, 'upload-history.json');
const HISTORY_RETENTION_MS  = 30 * 24 * 60 * 60 * 1000;

interface UploadHistory { [fileName: string]: number }
let uploadHistory: UploadHistory = {};

function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return;
    try {
        uploadHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        const now = Date.now();
        let pruned = 0;
        for (const [name, ts] of Object.entries(uploadHistory)) {
            if (now - ts > HISTORY_RETENTION_MS) { delete uploadHistory[name]; pruned++; }
        }
        if (pruned) saveHistory();
        console.log(`Loaded upload history (${Object.keys(uploadHistory).length} entries).`);
    } catch { uploadHistory = {}; }
}

function saveHistory() {
    try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(uploadHistory, null, 2)); } catch {}
}

function isInHistory(name: string)     { return !!uploadHistory[name]; }
function addToHistory(name: string)    { uploadHistory[name] = Date.now(); saveHistory(); }

// ─── Rename Log ───────────────────────────────────────────────────────────────

const RENAME_LOG_FILE = path.join(__dirname, 'claptrop-rename-log.json');
const renameLogs: object[] = [];

function flushRenameLogs() {
    if (!renameLogs.length) return;
    try {
        const existing = fs.existsSync(RENAME_LOG_FILE)
            ? JSON.parse(fs.readFileSync(RENAME_LOG_FILE, 'utf-8'))
            : [];
        fs.writeFileSync(RENAME_LOG_FILE, JSON.stringify([...existing, ...renameLogs], null, 2));
    } catch {}
}

// ─── Drive Folder Config ──────────────────────────────────────────────────────

const FOLDER_CONFIG = {
    JPG: {
        parent: '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4',
        local:  path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'jpg'),
        exts:   ['.jpg', '.jpeg'],
    },
    RAW: {
        parent: '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV',
        local:  path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'raf'),
        exts:   ['.raf'],
    },
    MOV: {
        parent: '13yWZiOr6UpDhS1VDtKVonx441O137Lc-',
        local:  path.join(process.env.HOME || '', 'Desktop', 'PHOTO UPLOADS', 'mov'),
        exts:   ['.mov', '.mp4'],
    },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function retryApiCall<T>(op: () => Promise<T>, desc: string, retries = 5): Promise<T> {
    try { return await op(); }
    catch (err: any) {
        if (retries > 0) {
            const delay = Math.pow(2, 6 - retries) * 1000;
            console.log(`Error ${desc}: ${err.message}. Retrying in ${delay / 1000}s…`);
            await new Promise(r => setTimeout(r, delay));
            return retryApiCall(op, desc, retries - 1);
        }
        throw err;
    }
}

async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
    return retryApiCall(async () => {
        const res = await drive.files.list({
            q: `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
        });
        if (res.data.files?.length) return res.data.files[0].id!;
        const folder = await drive.files.create({
            requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
            fields: 'id',
        });
        return folder.data.id!;
    }, `getOrCreateFolder(${name})`);
}

// Build a Set of all filenames (lowercased) in a Drive folder tree.
// Called once per type folder at startup so every subsequent lookup is O(1).
async function buildDriveFileIndex(folderId: string): Promise<Set<string>> {
    const names = new Set<string>();
    let pageToken: string | undefined;

    do {
        const res = await retryApiCall(() => drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType)',
            pageSize: 1000,
            ...(pageToken ? { pageToken } : {}),
        }), `buildIndex(${folderId})`);

        for (const f of res.data.files || []) {
            if (!f.id) continue;
            if (f.mimeType === 'application/vnd.google-apps.folder') {
                // Recurse into subfolders (e.g. "NEW UPLOADS" sub-tree)
                const sub = await buildDriveFileIndex(f.id);
                for (const n of sub) names.add(n);
            } else if (f.name) {
                names.add(f.name.toLowerCase());
            }
        }

        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return names;
}

async function removeDuplicatesInFolder(parentId: string, label: string) {
    const res = await retryApiCall(() => drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime',
    }), `listForDedupe(${label})`);

    const seen = new Map<string, string>();
    for (const f of res.data.files || []) {
        if (!f.name || !f.id) continue;
        if (seen.has(f.name)) {
            await retryApiCall(() => drive.files.delete({ fileId: f.id! }), `deleteDup(${f.name})`);
            console.log(`  Removed duplicate: ${f.name}`);
        } else {
            seen.set(f.name, f.id);
        }
    }
}

// ─── Upload a single file → Drive, then delete local copy ────────────────────

async function uploadAndClean(
    filePath: string,
    parentId: string,
    deleteAfter = false,
    driveIndex?: Set<string>,   // pre-built index for this type folder
): Promise<boolean> {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    const alreadyUploaded = isInHistory(fileName) || driveIndex?.has(fileName.toLowerCase());

    if (alreadyUploaded) {
        console.log(`  Skipping ${fileName} (${isInHistory(fileName) ? 'in history' : 'found in Drive index'})`);
        addToHistory(fileName);
        if (deleteAfter && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`  🗑  Deleted local: ${fileName}`);
        }
        return true;
    }

    console.log(`  Uploading ${fileName} (${formatBytes(fileSize)})…`);

    const success = await (async () => {
        for (let attempt = 0; attempt <= 5; attempt++) {
            try {
                await drive.files.create({
                    requestBody: { name: fileName, parents: [parentId] },
                    media: { body: fs.createReadStream(filePath) },
                }, {
                    onUploadProgress: (evt) => {
                        const pct = ((evt.bytesRead / fileSize) * 100).toFixed(0);
                        process.stdout.write(`\r  ${fileName}: ${pct}%`);
                    },
                });
                process.stdout.write('\n');
                return true;
            } catch (err: any) {
                process.stdout.write('\n');
                if (attempt < 5) {
                    const delay = Math.pow(2, attempt + 1) * 1000;
                    console.log(`  Upload failed (${err.message}). Retry in ${delay / 1000}s…`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    console.error(`  Failed after 5 retries: ${fileName}`);
                    return false;
                }
            }
        }
        return false;
    })();

    if (success) {
        addToHistory(fileName);
        driveIndex?.add(fileName.toLowerCase()); // keep index current within this run
        console.log(`  ✅ Uploaded: ${fileName}`);
        if (deleteAfter && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`  🗑  Deleted local: ${fileName}`);
        }
    }
    return success;
}

// ─── Recursive file list ──────────────────────────────────────────────────────

function getFilesRecursive(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir)) {
        if (entry.startsWith('.')) continue;
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) results.push(...getFilesRecursive(full));
        else results.push(full);
    }
    return results;
}

// ─── Phase 0: Flush local staging → Drive (frees disk space) ─────────────────

async function flushStagingToDrive(indexes: Record<string, Set<string>>) {
    console.log('\n=== Phase 0: Flushing local staging to Drive (freeing disk space) ===');
    const failed: string[] = [];

    for (const [type, config] of Object.entries(FOLDER_CONFIG)) {
        if (!fs.existsSync(config.local)) continue;
        const files = fs.readdirSync(config.local).filter(f => !f.startsWith('.'));
        if (!files.length) continue;

        console.log(`\nFlushing ${type} (${files.length} files)…`);
        const targetId = await getOrCreateFolder('NEW UPLOADS', config.parent);

        for (const file of files) {
            const filePath = path.join(config.local, file);
            if (!fs.statSync(filePath).isFile()) continue;
            const ok = await uploadAndClean(filePath, targetId, true, indexes[type]);
            if (!ok) failed.push(filePath);
        }
    }

    if (failed.length) {
        console.warn(`\n⚠️  ${failed.length} file(s) failed to upload — NOT deleted:\n` +
            failed.map(f => `  ${f}`).join('\n'));
    } else {
        console.log('\n✅ Staging flushed. Disk space reclaimed.');
    }
}

// ─── Phase 1: Import from SD card (with claptrop naming) ─────────────────────

async function importFromSDCard(sdPath: string) {
    console.log(`\n=== Phase 1: Importing from SD card (${sdPath}) ===`);
    resetSeqs();

    const allFiles = getFilesRecursive(sdPath);
    console.log(`Found ${allFiles.length} files on SD card.`);

    const order: { type: keyof typeof FOLDER_CONFIG; exts: string[] }[] = [
        { type: 'JPG', exts: ['.jpg', '.jpeg'] },
        { type: 'RAW', exts: ['.raf'] },
        { type: 'MOV', exts: ['.mov', '.mp4'] },
    ];

    for (const group of order) {
        const config  = FOLDER_CONFIG[group.type];
        const toImport = allFiles.filter(f => group.exts.includes(path.extname(f).toLowerCase()));
        if (!toImport.length) continue;

        console.log(`\nImporting ${toImport.length} ${group.type} file(s)…`);
        fs.mkdirSync(config.local, { recursive: true });

        // Build set of names already in destination (for collision detection)
        const existingNames = new Set(
            fs.readdirSync(config.local).map(f => f.toLowerCase())
        );

        for (const srcPath of toImport) {
            const srcFolder = path.basename(path.dirname(srcPath));
            const { meta, log } = await buildName({
                originalName:  path.basename(srcPath),
                filePath:      srcPath,
                subject:       SUBJECT_OVERRIDE,
                parentFolder:  srcFolder,
                existingNames,
            });

            const destPath = path.join(config.local, meta.filename);

            if (fs.existsSync(destPath)) continue; // already imported under new name

            try {
                console.log(`  ${log.original} → ${meta.filename}`);
                fs.copyFileSync(srcPath, destPath);
                renameLogs.push(log);
            } catch (err: any) {
                console.error(`  Error copying ${log.original}: ${err.message}`);
            }
        }
    }

    console.log('\n✅ SD card import complete.');
}

// ─── Phase 2: Upload Desktop staging → Drive ──────────────────────────────────

async function uploadStagingToDrive(indexes: Record<string, Set<string>>) {
    if (SKIP_DRIVE) { console.log('\n⏭  --skip-drive set. Skipping Drive upload.'); return; }

    console.log('\n=== Phase 2: Uploading staging to Drive ===');
    const failed: { filePath: string; parentId: string; type: string }[] = [];

    for (const [type, config] of Object.entries(FOLDER_CONFIG)) {
        if (!fs.existsSync(config.local)) continue;
        const files = fs.readdirSync(config.local).filter(f => !f.startsWith('.'));
        if (!files.length) { console.log(`\nNo files in ${type} staging.`); continue; }

        const targetId = await getOrCreateFolder('NEW UPLOADS', config.parent);
        await removeDuplicatesInFolder(targetId, type);

        console.log(`\nUploading ${files.length} ${type} file(s)…`);
        for (const file of files) {
            const filePath = path.join(config.local, file);
            if (!fs.statSync(filePath).isFile()) continue;
            const ok = await uploadAndClean(filePath, targetId, true, indexes[type]);
            if (!ok) failed.push({ filePath, parentId: targetId, type });
        }
    }

    // Retry failures — keep local file safe if it still fails
    if (failed.length) {
        console.log(`\n=== Retrying ${failed.length} failed upload(s) ===`);
        for (const { filePath, parentId, type } of failed) {
            await uploadAndClean(filePath, parentId, false, indexes[type]);
        }
    } else {
        console.log('\n✅ All uploads complete. Local staging cleared.');
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function startSync() {
    loadHistory();

    const SD_CARD_PATH = '/Volumes/CLAPTROP II/DCIM';
    const USE_SD_CARD  = fs.existsSync(SD_CARD_PATH);

    console.log('\n=== CLAPTROP Pipeline ===');
    if (SKIP_DRIVE)       console.log('Mode: Import only (--skip-drive)');
    else if (USE_SD_CARD) console.log('Mode: Full pipeline (SD → Local → Drive)');
    else                  console.log('Mode: Flush existing staging → Drive');

    // ── Build Drive file indexes (one API walk per folder, then O(1) lookups) ──
    console.log('\nBuilding Drive file indexes…');
    const driveIndexes: Record<string, Set<string>> = {};
    for (const [type, config] of Object.entries(FOLDER_CONFIG)) {
        driveIndexes[type] = await buildDriveFileIndex(config.parent);
        console.log(`  ${type}: ${driveIndexes[type].size} files indexed`);
    }

    // ── Check disk space ───────────────────────────────────────────────────────
    const desktopPath = path.join(process.env.HOME || '', 'Desktop');
    const available   = getAvailableBytes(desktopPath);
    const threshold   = LOW_DISK_THRESHOLD_GB * 1e9;

    console.log(`\nDisk available: ${formatBytes(available)}`);

    if (available < threshold) {
        console.log(`⚠️  Low disk space (< ${LOW_DISK_THRESHOLD_GB} GB). Flushing staging to Drive first…`);
        await flushStagingToDrive(driveIndexes);

        const nowAvailable = getAvailableBytes(desktopPath);
        console.log(`Disk available after flush: ${formatBytes(nowAvailable)}`);

        if (nowAvailable < threshold && USE_SD_CARD) {
            console.error('❌ Still insufficient disk space after flush. Cannot import from SD card.');
            process.exit(1);
        }
    }

    // ── SD card import (with claptrop naming) ──────────────────────────────────
    if (USE_SD_CARD) {
        console.log(`\n✅ SD Card detected: ${SD_CARD_PATH}`);
        await importFromSDCard(SD_CARD_PATH);
    } else {
        console.log('\n⚠️  SD Card not found. Skipping import step.');
    }

    // ── Upload staging → Drive (and clean up local files) ─────────────────────
    await uploadStagingToDrive(driveIndexes);

    // ── Write rename log ───────────────────────────────────────────────────────
    flushRenameLogs();
    if (renameLogs.length) {
        console.log(`\n📋 Rename log written → scripts/claptrop-rename-log.json (${renameLogs.length} entries)`);
    }

    console.log('\n=== Done ===');
}

startSync().catch(console.error);
