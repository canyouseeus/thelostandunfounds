/**
 * drive-sort-new-uploads.ts — enforce the archive layout: each archive's NEW UPLOADS
 * holds only date folders, with every file inside its date.
 *
 *   JPG/NEW UPLOADS/<YYYY-MM-DD>/…jpg
 *   RAW/NEW UPLOADS/<YYYY-MM-DD>/…_RAF.zip (+ .manifest.json)
 *   MOV/NEW UPLOADS/<YYYY-MM-DD>/…mov
 *
 * Moves (never copies, trashes or deletes) loose files in NEW UPLOADS into their date
 * folder: date from the filename, else the photo's capture date, else "unknown-date".
 * Also folds date-named folders sitting at an archive's top level (YYYY-MM-DD or
 * unknown-date) into NEW UPLOADS/<same date>. File IDs never change, so gallery rows
 * and links keep working.
 *
 *   node_modules/.bin/tsx scripts/drive-sort-new-uploads.ts            # dry run: counts per date
 *   node_modules/.bin/tsx scripts/drive-sort-new-uploads.ts --execute  # move
 */
import { google, drive_v3 } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const ARCHIVES = {
    JPG: '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4',
    RAW: '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV',
    MOV: '13yWZiOr6UpDhS1VDtKVonx441O137Lc-',
};
const EXECUTE = process.argv.includes('--execute');
const FOLDER = 'application/vnd.google-apps.folder';
const DATE_DIR = /^(\d{4}-\d{2}-\d{2}|unknown-date)$/;

async function retry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    for (let i = 1; ; i++) {
        try { return await fn(); } catch (e: any) {
            const code = e?.code ?? e?.response?.status;
            if (i >= 8 || (code && code < 500 && code !== 429 && code !== 403)) throw e;
            console.warn(`  retry ${i} ${label} (${code ?? e.message})`);
            await new Promise(r => setTimeout(r, Math.min(60_000, 1000 * 2 ** i)));
        }
    }
}

async function list(parent: string): Promise<drive_v3.Schema$File[]> {
    const out: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;
    do {
        const r = await retry(() => drive.files.list({
            q: `'${parent}' in parents and trashed = false`, pageSize: 1000, ...(pageToken ? { pageToken } : {}),
            fields: 'nextPageToken, files(id, name, mimeType, imageMediaMetadata(time))',
        }), 'list');
        out.push(...(r.data.files ?? []));
        pageToken = r.data.nextPageToken ?? undefined;
    } while (pageToken);
    return out;
}

const folderCache = new Map<string, string>();
async function folder(name: string, parent: string): Promise<string> {
    const k = `${parent}/${name}`;
    if (folderCache.has(k)) return folderCache.get(k)!;
    const r = await retry(() => drive.files.list({
        q: `name = '${name}' and '${parent}' in parents and mimeType = '${FOLDER}' and trashed = false`, fields: 'files(id)',
    }), 'find folder');
    let id = r.data.files?.[0]?.id;
    if (!id) {
        if (!EXECUTE) id = `(new ${name})`;
        else id = (await retry(() => drive.files.create({ requestBody: { name, parents: [parent], mimeType: FOLDER }, fields: 'id' }), 'mkdir')).data.id!;
    }
    folderCache.set(k, id);
    return id;
}

function dateOf(f: drive_v3.Schema$File): string {
    const fromName = f.name?.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    if (fromName) return fromName;
    const exif = f.imageMediaMetadata?.time?.slice(0, 10).replace(/:/g, '-');
    return exif && /^\d{4}-\d{2}-\d{2}$/.test(exif) && !exif.startsWith('0000') ? exif : 'unknown-date';
}

let moved = 0;
async function move(f: drive_v3.Schema$File, from: string, to: string) {
    if (!EXECUTE) return;
    await retry(() => drive.files.update({ fileId: f.id!, addParents: to, removeParents: from, fields: 'id' }), `move ${f.name}`);
    if (++moved % 200 === 0) console.log(`    moved ${moved}…`);
}

async function main() {
    console.log(`Mode: ${EXECUTE ? 'EXECUTE (moving)' : 'DRY RUN (no changes)'}`);
    for (const [label, root] of Object.entries(ARCHIVES)) {
        const nu = await folder('NEW UPLOADS', root);
        const counts: Record<string, number> = {};

        // 1. date folders at the archive's top level → NEW UPLOADS/<date>
        const top = (await list(root)).filter(f => f.mimeType === FOLDER && DATE_DIR.test(f.name ?? ''));
        for (const d of top) {
            const items = await list(d.id!);
            const dest = await folder(d.name!, nu);
            const q = [...items]; counts[d.name!] = (counts[d.name!] ?? 0) + items.length;
            await Promise.all(Array.from({ length: 8 }, async () => { for (let f; (f = q.shift()); ) await move(f, d.id!, dest); }));
            if (EXECUTE && (await list(d.id!)).length === 0) {
                // Empty now — move the empty folder into Drive trash (recoverable), never delete.
                await retry(() => drive.files.update({ fileId: d.id!, requestBody: { trashed: true } }), `trash empty ${d.name}`);
            }
        }

        // 2. loose files directly in NEW UPLOADS → NEW UPLOADS/<date>
        const loose = (await list(nu)).filter(f => f.mimeType !== FOLDER);
        for (const f of loose) { const d = dateOf(f); await folder(d, nu); counts[d] = (counts[d] ?? 0) + 1; }
        const queue = [...loose];
        await Promise.all(Array.from({ length: 8 }, async () => {     // 8 moves at a time
            for (let f; (f = queue.shift()); ) await move(f, nu, await folder(dateOf(f), nu));
        }));

        const total = Object.values(counts).reduce((s, n) => s + n, 0);
        console.log(`\n${label}: ${loose.length} loose in NEW UPLOADS + ${top.length} top-level date folder(s) → ${total} file(s) into ${Object.keys(counts).length} date folder(s)`);
        for (const [d, n] of Object.entries(counts).sort()) console.log(`  ${d}  ${n}`);
    }
    console.log(EXECUTE ? `\nDone: moved ${moved} file(s).` : '\nDry run only. Re-run with --execute to move.');
}

main().catch(e => { console.error(e); process.exit(1); });
