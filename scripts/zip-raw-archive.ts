/**
 * zip-raw-archive.ts — convert loose RAFs already in the Drive RAW archive into
 * one zip per shoot date (see drive-raw-zip.ts for the layout).
 *
 * Date = YYYY-MM-DD in the filename, else the photo's capture date from Drive
 * metadata, else "unknown-date". Per date: download every loose RAF, check its
 * md5 against Drive, zip, upload + verify, then move the loose RAFs to Drive
 * trash (recoverable 30 days). Safe to stop and re-run: finished dates have no
 * loose RAFs left.
 *
 * Drive trash still counts against quota, so the run stops before it would
 * overflow the account; empty the Drive trash and re-run to continue.
 *
 * Usage:
 *   node_modules/.bin/tsx scripts/zip-raw-archive.ts               # dry run: per-date plan
 *   node_modules/.bin/tsx scripts/zip-raw-archive.ts --execute     # convert
 *   … --execute --max-gb 200                                       # stop after ~200 GB of RAFs
 */

import { google } from 'googleapis';
import fs from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { zipAndUploadDate, md5OfFileStream } from './drive-raw-zip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const RAW_ARCHIVE = '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV';
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const MAX_GB = (() => { const i = args.indexOf('--max-gb'); return i !== -1 ? +args[i + 1] : Infinity; })();
const ZIP_RATIO = 0.72;            // measured: RAF deflates to ~70% at level 1
const QUOTA_MARGIN = 25e9;         // never run the account closer than this to full
const gb = (b: number) => `${(b / 1e9).toFixed(1)} GB`;

interface Raf { id: string; name: string; size: number; md5: string; date: string; parents: string[] }

async function retry<T>(fn: () => Promise<T>, label: string, tries = 6): Promise<T> {
    for (let i = 1; ; i++) {
        try { return await fn(); }
        catch (e: any) {
            const code = e?.code ?? e?.response?.status;
            if (i >= tries || !(code === 429 || code === 403 || code >= 500 || !code)) throw e;
            await new Promise(r => setTimeout(r, 1000 * 2 ** i));
            console.warn(`  retry ${i} ${label} (${code ?? e.message})`);
        }
    }
}

async function listLooseRafs(): Promise<Raf[]> {
    const out: Raf[] = [];
    const walk = async (folderId: string) => {
        let pageToken: string | undefined;
        do {
            const res = await retry(() => drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, size, md5Checksum, mimeType, parents, imageMediaMetadata(time))',
                pageSize: 1000, ...(pageToken ? { pageToken } : {}),
            }), 'list');
            for (const f of res.data.files ?? []) {
                if (f.mimeType === 'application/vnd.google-apps.folder') { await walk(f.id!); continue; }
                if (!/\.raf$/i.test(f.name ?? '') || !f.md5Checksum) continue;
                const fromName = f.name!.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
                const fromExif = f.imageMediaMetadata?.time?.slice(0, 10).replace(/:/g, '-');
                const date = fromName ?? (fromExif && /^\d{4}-\d{2}-\d{2}$/.test(fromExif) ? fromExif : 'unknown-date');
                out.push({ id: f.id!, name: f.name!, size: +(f.size ?? 0), md5: f.md5Checksum, date, parents: f.parents ?? [] });
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
    };
    await walk(RAW_ARCHIVE);
    return out;
}

async function quotaHeadroom(): Promise<number> {
    const q = (await retry(() => drive.about.get({ fields: 'storageQuota' }), 'quota')).data.storageQuota!;
    return q.limit ? +q.limit - +q.usage! : Infinity;
}

async function child(name: string, parent: string): Promise<string> {
    const res = await retry(() => drive.files.list({
        q: `name = '${name}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
    }), 'folder');
    if (res.data.files?.length) return res.data.files[0].id!;
    return (await drive.files.create({ requestBody: { name, parents: [parent], mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' })).data.id!;
}
// Zips live in RAW/NEW UPLOADS/<date>/, like the pipeline's.
async function folderFor(date: string): Promise<string> {
    return child(date, await child('NEW UPLOADS', RAW_ARCHIVE));
}

async function download(f: Raf, dest: string) {
    for (let i = 1; ; i++) {
        try {
            const res = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'stream' });
            await new Promise<void>((resolve, reject) => {
                const w = fs.createWriteStream(dest);
                (res.data as NodeJS.ReadableStream).on('error', reject).pipe(w).on('finish', () => resolve()).on('error', reject);
            });
            if (await md5OfFileStream(dest) !== f.md5) throw new Error('md5 mismatch after download');
            return;
        } catch (e: any) {
            if (i >= 5) throw new Error(`download ${f.name}: ${e.message}`);
            await new Promise(r => setTimeout(r, 2000 * 2 ** i));
        }
    }
}

async function convertDate(date: string, rafs: Raf[]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rawzip-${date}-`));
    try {
        // Camera names can repeat within a day; keep zip entry names unique.
        const seen = new Set<string>();
        const local: string[] = [];
        const queue = rafs.map(f => {
            let name = f.name;
            if (seen.has(name.toLowerCase())) name = name.replace(/(\.[^.]+)$/, `_${f.id.slice(0, 8)}$1`);
            seen.add(name.toLowerCase());
            const p = path.join(dir, name); local.push(p);
            return { f, p };
        });
        let done = 0;
        await Promise.all(Array.from({ length: 4 }, async () => {
            for (let job; (job = queue.shift()); ) {
                await download(job.f, job.p);
                if (++done % 50 === 0) console.log(`    downloaded ${done}/${rafs.length}`);
            }
        }));

        await zipAndUploadDate(drive, auth, local, date, await folderFor(date));

        for (const f of rafs) await retry(() => drive.files.update({ fileId: f.id, requestBody: { trashed: true } }), `trash ${f.name}`);
        console.log(`  🗑  moved ${rafs.length} loose RAF(s) for ${date} to Drive trash`);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

async function main() {
    console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN (no changes)'}`);
    const rafs = await listLooseRafs();
    const byDate = new Map<string, Raf[]>();
    for (const f of rafs) (byDate.get(f.date) ?? byDate.set(f.date, []).get(f.date)!).push(f);
    const dates = [...byDate.keys()].sort();
    const total = rafs.reduce((s, f) => s + f.size, 0);
    console.log(`Loose RAFs: ${rafs.length} (${gb(total)}) across ${dates.length} dates; est. zipped ${gb(total * ZIP_RATIO)}, saves ~${gb(total * (1 - ZIP_RATIO))}`);
    console.log(`Quota headroom now: ${gb(await quotaHeadroom())}`);

    if (!EXECUTE) {
        for (const d of dates) { const g = byDate.get(d)!; console.log(`  ${d}  ${String(g.length).padStart(5)}  ${gb(g.reduce((s, f) => s + f.size, 0))}`); }
        console.log('\nDry run only. Re-run with --execute to convert.');
        return;
    }

    let processed = 0;
    for (const d of dates) {
        const g = byDate.get(d)!;
        const bytes = g.reduce((s, f) => s + f.size, 0);
        if (processed + bytes > MAX_GB * 1e9 && processed > 0) { console.log(`\nReached --max-gb ${MAX_GB}; stopping. Re-run to continue.`); break; }
        const headroom = await quotaHeadroom();
        if (headroom - bytes * ZIP_RATIO < QUOTA_MARGIN) {
            console.log(`\n⏸  Stopping before ${d}: Drive headroom ${gb(headroom)} is too low for its ~${gb(bytes * ZIP_RATIO)} zip.`);
            console.log('   Empty the Google Drive trash, then re-run with --execute to continue.');
            break;
        }
        if (fs.statfsSync(os.tmpdir()).bavail * fs.statfsSync(os.tmpdir()).bsize < bytes * 1.9 + 10e9) {
            console.log(`\n⏸  Not enough local disk to convert ${d} (${gb(bytes)}). Free space and re-run.`); break;
        }
        console.log(`\n▶ ${d}: ${g.length} RAF(s), ${gb(bytes)}`);
        try { await convertDate(d, g); processed += bytes; }
        catch (e: any) { console.error(`  ❌ ${d} failed, loose RAFs left untouched: ${e.message}`); }
    }
    console.log(`\nConverted ${gb(processed)} of RAFs this run. Headroom now ${gb(await quotaHeadroom())}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
