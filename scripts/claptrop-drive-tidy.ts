/**
 * CLAPTROP Drive Tidy
 * Keeps the Drive archive itself clean — the upload check stops new copies
 * going up, this clears the ones already there and files the RAWs away.
 *
 *   --dedupe  Trash byte-identical copies (same Drive md5Checksum + size) under
 *             the JPG, RAW and MOV roots. A file the website uses is never
 *             trashed. Goes to Drive's trash, so it is recoverable for 30 days.
 *   --sort    Move every .raf under RAW into RAW/YYYY-MM-DD by capture date,
 *             read from the RAF's own EXIF (falls back to the date in the name,
 *             then RAW/unknown-date).
 *   --zip     Pack each RAW date folder's loose .raf files into
 *             YYYY-MM-DD_partN.zip (≤ 2 GB each) and trash the originals once
 *             Drive confirms the upload byte-for-byte.
 *
 * Nothing changes without --apply; without it every step only prints its plan.
 *
 * Usage:
 *   node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --dedupe --sort           # preview
 *   node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --dedupe --sort --apply
 *   node_modules/.bin/tsx scripts/claptrop-drive-tidy.ts --zip --apply [--folder 2026-05-06]
 */

import { google, type drive_v3 } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import zlib from 'zlib';
import path from 'path';
import { PassThrough } from 'stream';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
    rafJpegOffset, parseExifFromBuffer, dateFromName,
    isCurrentName, isClaptropName, formatBytes,
} from './claptrop-namer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

type Drive = drive_v3.Drive;

export const DRIVE_ROOTS = {
    JPG: '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4',
    RAW: '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV',
    MOV: '13yWZiOr6UpDhS1VDtKVonx441O137Lc-',
} as const;

const DATE_FOLDER    = /^\d{4}-\d{2}-\d{2}$/;
const UNKNOWN_DATE   = 'unknown-date';
const FOLDER_MIME    = 'application/vnd.google-apps.folder';
export const MANIFEST_SUFFIX = '.manifest.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function retry<T>(op: () => Promise<T>, desc: string, retries = 5): Promise<T> {
    try { return await op(); }
    catch (err: any) {
        if (retries > 0 && err?.code !== 404) {
            const delay = Math.pow(2, 6 - retries) * 1000;
            console.log(`  Error ${desc}: ${err.message}. Retrying in ${delay / 1000}s…`);
            await new Promise(r => setTimeout(r, delay));
            return retry(op, desc, retries - 1);
        }
        throw err;
    }
}

async function pMap<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
    let i = 0;
    const worker = async () => { while (i < items.length) await fn(items[i++]); };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ─── Tree listing ─────────────────────────────────────────────────────────────

export interface DriveEntry {
    id: string;
    name: string;
    size: number;
    md5?: string;
    createdTime: string;
    parentId: string;
}

export interface DriveFolder { id: string; name: string; parentId: string }

export interface DriveTree { rootId: string; files: DriveEntry[]; folders: DriveFolder[] }

// Every page of every folder. Listing one page is how the old dedupe ended up
// checking the first 100 of ~10,000 RAWs.
export async function listTree(drive: Drive, rootId: string): Promise<DriveTree> {
    const tree: DriveTree = { rootId, files: [], folders: [] };
    const queue = [rootId];
    while (queue.length) {
        const folderId = queue.shift()!;
        let pageToken: string | undefined;
        do {
            const res = await retry(() => drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size, md5Checksum, createdTime)',
                pageSize: 1000,
                ...(pageToken ? { pageToken } : {}),
            }), `list(${folderId})`);
            for (const f of res.data.files || []) {
                if (!f.id || !f.name) continue;
                if (f.mimeType === FOLDER_MIME) {
                    tree.folders.push({ id: f.id, name: f.name, parentId: folderId });
                    queue.push(f.id);
                } else {
                    tree.files.push({
                        id: f.id, name: f.name, size: Number(f.size || 0),
                        md5: f.md5Checksum ?? undefined,
                        createdTime: f.createdTime || '', parentId: folderId,
                    });
                }
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
    }
    return tree;
}

// ─── Files the website uses ───────────────────────────────────────────────────

// Returns null when the check can't be trusted. A stale .env.local pointing at
// the retired Supabase project would return an empty set, and an empty set
// would make every gallery photo look unused — so require that the JPG archive
// (the jpg-archive gallery's own folder) actually overlaps what we loaded.
export async function loadSiteFileIds(jpgTree: DriveTree): Promise<Set<string> | null> {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) { console.warn('  ⚠️  No Supabase credentials — cannot tell which files the site uses.'); return null; }

    const supabase = createClient(url, key);
    const ids = new Set<string>();
    for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
            .from('photos').select('google_drive_file_id')
            .not('google_drive_file_id', 'is', null)
            .range(from, from + 999);
        if (error) { console.warn(`  ⚠️  Could not read photos: ${error.message}`); return null; }
        for (const r of data || []) ids.add(r.google_drive_file_id);
        if (!data || data.length < 1000) break;
    }

    const overlap = jpgTree.files.filter(f => ids.has(f.id)).length;
    if (!overlap) {
        console.warn(`  ⚠️  Loaded ${ids.size} site photos but none are in the JPG archive — ` +
            `.env.local is probably pointing at the wrong Supabase project.`);
        return null;
    }
    console.log(`  Site uses ${ids.size} Drive files (${overlap} in the JPG archive).`);
    return ids;
}

// ─── Dedupe ───────────────────────────────────────────────────────────────────

// Which copy survives: one the site uses, then the best name, then the oldest.
function keepRank(f: DriveEntry, site: Set<string>): (number | string)[] {
    return [
        site.has(f.id) ? 0 : 1,
        isCurrentName(f.name) ? 0 : isClaptropName(f.name) ? 1 : 2,
        f.createdTime,
    ];
}

function compareRank(a: (number | string)[], b: (number | string)[]) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return 0;
}

export async function dedupeTree(
    drive: Drive, tree: DriveTree, label: string, site: Set<string>, apply: boolean,
) {
    const groups = new Map<string, DriveEntry[]>();
    for (const f of tree.files) {
        if (!f.md5) continue; // Google Docs etc. have no checksum — never guess
        const k = `${f.md5}:${f.size}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(f);
    }

    let trashed = 0, bytes = 0, kept = 0;
    for (const copies of groups.values()) {
        if (copies.length < 2) continue;
        copies.sort((a, b) => compareRank(keepRank(a, site), keepRank(b, site)));
        const [keep, ...rest] = copies;
        for (const dup of rest) {
            if (site.has(dup.id)) { kept++; continue; } // the site points at it — leave it
            console.log(`  ${apply ? 'Trashing' : 'Would trash'} ${dup.name} (copy of ${keep.name})`);
            if (apply) {
                await retry(() => drive.files.update({ fileId: dup.id, requestBody: { trashed: true } }),
                    `trash(${dup.name})`);
            }
            trashed++; bytes += dup.size;
        }
    }
    console.log(`  ${label}: ${trashed} duplicate(s), ${formatBytes(bytes)} ` +
        `${apply ? 'moved to trash' : 'would be freed'}` +
        (kept ? ` — ${kept} more left alone because the site uses them` : ''));
    return { trashed, bytes };
}

// ─── RAF capture date ─────────────────────────────────────────────────────────

async function fetchRange(drive: Drive, fileId: string, start: number, end: number): Promise<Buffer> {
    const res = await retry(() => drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer', headers: { Range: `bytes=${start}-${end}` } },
    ), `range(${fileId})`);
    return Buffer.from(res.data as ArrayBuffer);
}

// Two small ranged reads instead of downloading 58 MB to read one date.
export async function rafCaptureDate(drive: Drive, fileId: string): Promise<string | null> {
    const head = await fetchRange(drive, fileId, 0, 262143);
    const off  = rafJpegOffset(head);
    if (off === null) return null;
    const jpeg = off + 65536 <= head.length
        ? head.slice(off)
        : await fetchRange(drive, fileId, off, off + 65535);
    const d = parseExifFromBuffer(jpeg).dateTaken;
    return d ? d.toISOString().slice(0, 10) : null;
}

// ─── Sort RAWs into date folders ──────────────────────────────────────────────

async function dateFolderMap(drive: Drive, tree: DriveTree) {
    // name → id, direct children of the root only. Holds the promise, not the id:
    // moves run in parallel, and two files of the same new date must share one mkdir.
    const map = new Map<string, Promise<string>>();
    for (const f of tree.folders) {
        if (f.parentId === tree.rootId && (DATE_FOLDER.test(f.name) || f.name === UNKNOWN_DATE)) map.set(f.name, Promise.resolve(f.id));
    }
    return (name: string) => {
        if (!map.has(name)) {
            map.set(name, retry(() => drive.files.create({
                requestBody: { name, mimeType: FOLDER_MIME, parents: [tree.rootId] }, fields: 'id',
            }), `mkdir(${name})`).then(res => res.data.id!));
        }
        return map.get(name)!;
    };
}

export async function sortRawByDate(drive: Drive, tree: DriveTree, apply: boolean) {
    const sortedFolders = new Set(tree.folders
        .filter(f => f.parentId === tree.rootId && (DATE_FOLDER.test(f.name) || f.name === UNKNOWN_DATE))
        .map(f => f.id));
    const loose = tree.files.filter(f => /\.raf$/i.test(f.name) && !sortedFolders.has(f.parentId));
    console.log(`  ${loose.length} RAW file(s) not yet in a date folder.`);
    if (!loose.length) return { moved: 0 };

    const folderFor = await dateFolderMap(drive, tree);
    const plan = new Map<string, number>();
    let moved = 0, done = 0;

    await pMap(loose, 6, async (f) => {
        let date: string | null = null;
        try { date = await rafCaptureDate(drive, f.id); } catch (err: any) {
            console.warn(`  ⚠️  Could not read EXIF from ${f.name}: ${err.message}`);
        }
        const target = date || dateFromName(f.name) || UNKNOWN_DATE;
        plan.set(target, (plan.get(target) || 0) + 1);
        if (apply) {
            const folderId = await folderFor(target);
            await retry(() => drive.files.update({
                fileId: f.id, addParents: folderId, removeParents: f.parentId, fields: 'id',
            }), `move(${f.name})`);
            moved++;
        }
        if (++done % 250 === 0) console.log(`  …${done}/${loose.length}`);
    });

    for (const [d, n] of [...plan].sort()) console.log(`  ${d}: ${n} file(s)`);
    console.log(`  ${apply ? `Moved ${moved}` : `Would move ${loose.length}`} RAW file(s) into date folders.`);
    return { moved };
}

// ─── Zip writer ───────────────────────────────────────────────────────────────
//
// Each entry is compressed whole before it is written, so the local header can
// carry the real sizes and CRC — no data descriptors, no ZIP64 (parts stay
// under 4 GB), which keeps the archives readable by macOS Archive Utility.

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

export function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(iso: string) {
    const d = new Date(iso || Date.now());
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const date = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
}

export class ZipWriter {
    private offset = 0;
    private central: Buffer[] = [];
    private count = 0;
    constructor(private write: (chunk: Buffer) => Promise<void>) {}

    async add(name: string, data: Buffer, modified: string) {
        const deflated = zlib.deflateRawSync(data, { level: 6 });
        const stored   = deflated.length >= data.length;
        const body     = stored ? data : deflated;
        const crc      = crc32(data);
        const { time, date } = dosDateTime(modified);
        const nameBuf  = Buffer.from(name, 'utf8');
        if (this.offset + 30 + nameBuf.length + body.length > 0xffffffff) throw new Error('zip part exceeds 4 GB');

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);              // version needed
        local.writeUInt16LE(0x0800, 6);          // UTF-8 names
        local.writeUInt16LE(stored ? 0 : 8, 8);  // stored / deflate
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(date, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(body.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);

        const cen = Buffer.alloc(46);
        cen.writeUInt32LE(0x02014b50, 0);
        cen.writeUInt16LE(20, 4);                // version made by
        cen.writeUInt16LE(20, 6);
        cen.writeUInt16LE(0x0800, 8);
        cen.writeUInt16LE(stored ? 0 : 8, 10);
        cen.writeUInt16LE(time, 12);
        cen.writeUInt16LE(date, 14);
        cen.writeUInt32LE(crc, 16);
        cen.writeUInt32LE(body.length, 20);
        cen.writeUInt32LE(data.length, 24);
        cen.writeUInt16LE(nameBuf.length, 28);
        cen.writeUInt32LE(this.offset, 42);      // local header offset
        this.central.push(cen, nameBuf);

        await this.write(Buffer.concat([local, nameBuf]));
        await this.write(body);
        this.offset += 30 + nameBuf.length + body.length;
        this.count++;
        return { crc, compressed: body.length };
    }

    async finish() {
        const cd  = Buffer.concat(this.central);
        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0);
        end.writeUInt16LE(this.count, 8);
        end.writeUInt16LE(this.count, 10);
        end.writeUInt32LE(cd.length, 12);
        end.writeUInt32LE(this.offset, 16);
        await this.write(cd);
        await this.write(end);
        return this.offset + cd.length + end.length;
    }
}

// ─── Zip RAW date folders ─────────────────────────────────────────────────────

const PART_BYTES   = 2e9;  // matches the largest single uploads CLAPTROP already makes reliably
const MIN_SAVINGS  = 0.10; // below this, zipping costs more in hassle than it saves

async function downloadVerified(drive: Drive, f: DriveEntry): Promise<Buffer> {
    const res = await retry(() => drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'arraybuffer' }),
        `download(${f.name})`);
    const buf = Buffer.from(res.data as ArrayBuffer);
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    if (buf.length !== f.size || (f.md5 && md5 !== f.md5)) throw new Error(`download of ${f.name} did not match Drive's checksum`);
    return buf;
}

// Build the zip straight into the upload — no local disk needed, which matters
// on a Mac CLAPTROP already flushes when it drops under 2 GB free.
async function uploadPart(drive: Drive, folderId: string, zipName: string, files: DriveEntry[]) {
    const body = new PassThrough();
    const hash = crypto.createHash('md5');
    let raw = 0;
    const write = async (chunk: Buffer) => {
        hash.update(chunk);
        if (!body.write(chunk)) await new Promise(r => body.once('drain', r));
    };

    const upload = drive.files.create({
        requestBody: { name: zipName, parents: [folderId] },
        media: { mimeType: 'application/zip', body },
        fields: 'id, size, md5Checksum',
    });
    // Stop feeding a stream nobody is reading if the request dies early.
    let failed: any = null;
    upload.catch(err => { failed = err; body.destroy(); });

    const zip = new ZipWriter(write);
    const manifest: { name: string; size: number; md5?: string; crc32: number }[] = [];
    try {
        for (const f of files) {
            if (failed) throw failed;
            const data = await downloadVerified(drive, f);
            const { crc } = await zip.add(f.name, data, f.createdTime);
            manifest.push({ name: f.name, size: f.size, md5: f.md5, crc32: crc });
            raw += f.size;
        }
        const total = await zip.finish();
        body.end();
        const res = await upload;
        const md5 = hash.digest('hex');
        if (Number(res.data.size) !== total || res.data.md5Checksum !== md5) {
            await drive.files.update({ fileId: res.data.id!, requestBody: { trashed: true } }).catch(() => {});
            throw new Error(`Drive's copy of ${zipName} does not match what was sent`);
        }
        return { id: res.data.id!, size: total, raw, manifest };
    } catch (err) {
        body.destroy();
        throw failed || err;
    }
}

export async function zipRawFolders(drive: Drive, tree: DriveTree, apply: boolean, only?: string) {
    const folders = tree.folders
        .filter(f => f.parentId === tree.rootId && DATE_FOLDER.test(f.name) && (!only || f.name === only))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Measure before committing to anything: one real RAW, compressed.
    const probe = tree.files.find(f => /\.raf$/i.test(f.name) && folders.some(d => d.id === f.parentId));
    if (!probe) { console.log('  No loose RAW files in date folders — run --sort first.'); return; }
    const sample = await downloadVerified(drive, probe);
    const savings = 1 - zlib.deflateRawSync(sample, { level: 6 }).length / sample.length;
    console.log(`  Sample ${probe.name}: zipping saves ${(savings * 100).toFixed(1)}%.`);
    if (savings < MIN_SAVINGS) {
        console.log(`  Under ${MIN_SAVINGS * 100}% — not worth zipping (these RAWs are already compressed). Stopping.`);
        return;
    }

    let freed = 0;
    for (const folder of folders) {
        const loose = tree.files
            .filter(f => f.parentId === folder.id && /\.raf$/i.test(f.name))
            .sort((a, b) => a.name.localeCompare(b.name));
        if (!loose.length) continue;

        const partRe = new RegExp(`^${folder.name}_part(\\d+)\\.zip$`);
        let part = Math.max(0, ...tree.files.filter(f => f.parentId === folder.id)
            .map(f => Number(f.name.match(partRe)?.[1] || 0)));

        const chunks: DriveEntry[][] = [[]];
        let acc = 0;
        for (const f of loose) {
            if (acc + f.size > PART_BYTES && chunks[chunks.length - 1].length) { chunks.push([]); acc = 0; }
            chunks[chunks.length - 1].push(f); acc += f.size;
        }

        const gb = loose.reduce((s, f) => s + f.size, 0);
        console.log(`\n  ${folder.name}: ${loose.length} RAW file(s), ${formatBytes(gb)} → ${chunks.length} zip part(s)`);
        if (!apply) continue;

        for (const files of chunks) {
            const zipName = `${folder.name}_part${++part}.zip`;
            let result: Awaited<ReturnType<typeof uploadPart>> | null = null;
            for (let attempt = 1; attempt <= 3 && !result; attempt++) {
                try { result = await uploadPart(drive, folder.id, zipName, files); }
                catch (err: any) { console.warn(`  ⚠️  ${zipName} attempt ${attempt} failed: ${err.message}`); }
            }
            if (!result) { console.error(`  ❌ Gave up on ${zipName} — originals left as they were.`); continue; }

            // The upload index reads this so a zipped RAW still counts as "in Drive".
            await retry(() => drive.files.create({
                requestBody: { name: zipName.replace(/\.zip$/, MANIFEST_SUFFIX), parents: [folder.id] },
                media: { mimeType: 'application/json', body: JSON.stringify(result!.manifest, null, 2) },
                fields: 'id',
            }), `manifest(${zipName})`);

            for (const f of files) {
                await retry(() => drive.files.update({ fileId: f.id, requestBody: { trashed: true } }), `trash(${f.name})`);
            }
            freed += result.raw - result.size;
            console.log(`  ✅ ${zipName}: ${files.length} files, ${formatBytes(result.raw)} → ${formatBytes(result.size)}`);
        }
    }
    if (apply) console.log(`\n  Zipping freed ${formatBytes(freed)} (originals are in Drive's trash for 30 days).`);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export function driveFromEnv(): Drive {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new Error('Missing Google OAuth2 credentials in .env.local');
    }
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth });
}

// Dedupe every root, then sort RAW. Shared by the CLI and upload-to-drive's last phase.
export async function tidy(drive: Drive, opts: { dedupe: boolean; sort: boolean; apply: boolean }) {
    if (opts.dedupe) {
        console.log('\n── Dedupe ──');
        const trees = {
            JPG: await listTree(drive, DRIVE_ROOTS.JPG),
            RAW: await listTree(drive, DRIVE_ROOTS.RAW),
            MOV: await listTree(drive, DRIVE_ROOTS.MOV),
        };
        const site = await loadSiteFileIds(trees.JPG);
        if (!site) {
            console.warn('  Skipping dedupe — without knowing which files the site uses, nothing is safe to trash.');
        } else {
            for (const [label, tree] of Object.entries(trees)) await dedupeTree(drive, tree, label, site, opts.apply);
        }
    }
    if (opts.sort) {
        console.log('\n── Sort RAW by date ──');
        await sortRawByDate(drive, await listTree(drive, DRIVE_ROOTS.RAW), opts.apply);
    }
}

async function main() {
    const args  = process.argv.slice(2);
    const apply = args.includes('--apply');
    const only  = (() => { const i = args.indexOf('--folder'); return i !== -1 ? args[i + 1] : undefined; })();
    const steps = { dedupe: args.includes('--dedupe'), sort: args.includes('--sort'), zip: args.includes('--zip') };
    if (!steps.dedupe && !steps.sort && !steps.zip) {
        console.log('Pick at least one of --dedupe, --sort, --zip (add --apply to make changes).');
        process.exit(1);
    }

    console.log(`\n=== CLAPTROP Drive Tidy ${apply ? '' : '(preview — nothing will change)'} ===`);
    const drive = driveFromEnv();
    await tidy(drive, { ...steps, apply });
    if (steps.zip) {
        console.log('\n── Zip RAW date folders ──');
        await zipRawFolders(drive, await listTree(drive, DRIVE_ROOTS.RAW), apply, only);
    }
    if (!apply) console.log('\nPreview only. Re-run with --apply to make these changes.');
}

const isMain = process.argv[1] && (
    process.argv[1].endsWith('claptrop-drive-tidy.ts') ||
    process.argv[1].endsWith('claptrop-drive-tidy.js')
);
if (isMain) main().catch(err => { console.error(err); process.exit(1); });
