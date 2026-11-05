/**
 * drive-raw-zip.ts — RAF files live in Drive as one zip per shoot date.
 *
 *   RAW archive / YYYY-MM-DD / @tlau.media_thelostandunfounds_YYYY-MM-DD_RAF.zip
 *                              @tlau.media_thelostandunfounds_YYYY-MM-DD_RAF.zip.manifest.json
 *
 * The manifest lists every entry's name, size and md5 so duplicate detection
 * (which only sees Drive-level md5s) still knows what is inside each zip.
 * A second batch for the same date becomes _RAF_2.zip, _RAF_3.zip, …
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import type { drive_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export const RAW_ZIP_PREFIX = '@tlau.media_thelostandunfounds';
export const MANIFEST_SUFFIX = '.manifest.json';
const CHUNK = 64 * 1024 * 1024; // resumable chunk; must be a multiple of 256 KiB

export interface ManifestEntry { name: string; size: number; md5: string }

export function md5OfFileStream(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('md5');
        fs.createReadStream(filePath).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
    });
}

/** Read every manifest in a folder listing and return its entries. */
export async function readManifest(drive: drive_v3.Drive, fileId: string): Promise<ManifestEntry[]> {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
    try { return JSON.parse(res.data as unknown as string).entries ?? []; } catch { return []; }
}

/** Zip files (stored under their own basenames) with fast deflate, then integrity-test. */
export function buildZip(files: string[], zipPath: string) {
    if (fs.existsSync(zipPath)) fs.rmSync(zipPath);
    const names = new Set(files.map(f => path.basename(f)));
    if (names.size !== files.length) throw new Error('duplicate file names in zip batch');
    execFileSync('zip', ['-1', '-q', '-j', zipPath, ...files]);
    execFileSync('unzip', ['-tq', zipPath]);
    const entries = execFileSync('zipinfo', ['-1', zipPath]).toString().trim().split('\n').length;
    if (entries !== files.length) throw new Error(`zip has ${entries} entries, expected ${files.length}`);
}

/** Chunked resumable upload; survives dropped connections by resuming from the server's offset. */
export async function uploadResumable(
    auth: OAuth2Client, filePath: string, name: string, parentId: string, mimeType: string,
    onProgress?: (pct: number) => void,
): Promise<{ id: string; md5Checksum: string }> {
    const token = async () => (await auth.getAccessToken()).token;
    const size = fs.statSync(filePath).size;
    // Opening the session is retried too: a lone 502 here used to fail the whole zip.
    let init!: Response;
    for (let attempt = 1; ; attempt++) {
        try {
            init = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,md5Checksum', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': mimeType, 'X-Upload-Content-Length': String(size),
                },
                body: JSON.stringify({ name, parents: [parentId], mimeType }),
            });
            if (init.ok) break;
            if (init.status < 500 && init.status !== 429) throw Object.assign(new Error(`upload session ${init.status}: ${(await init.text()).slice(0, 300)}`), { fatal: true });
        } catch (e: any) {
            if (e.fatal) throw e;
        }
        if (attempt >= 8) throw new Error(`upload session for ${name} failed after ${attempt} attempts (last status ${init?.status ?? 'network error'})`);
        await new Promise(r => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
    }
    const session = init.headers.get('location')!;

    const serverOffset = async (): Promise<number | 'done'> => {
        const st = await fetch(session, { method: 'PUT', headers: { Authorization: `Bearer ${await token()}`, 'Content-Range': `bytes */${size}` } });
        if (st.ok) return 'done';
        // Only a 308 reports progress; anything else (5xx) says nothing, so keep our offset.
        if (st.status !== 308) throw new Error(`status query ${st.status}`);
        const r = st.headers.get('range');
        return r ? +r.split('-')[1] + 1 : 0;
    };

    const fd = fs.openSync(filePath, 'r');
    try {
        let offset = 0;
        for (let failures = 0; ; ) {
            const len = Math.min(CHUNK, size - offset);
            const buf = Buffer.alloc(len);
            fs.readSync(fd, buf, 0, len, offset);
            try {
                const res = await fetch(session, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${await token()}`, 'Content-Length': String(len), 'Content-Range': `bytes ${offset}-${offset + len - 1}/${size}` },
                    body: buf,
                });
                if (res.ok) return await res.json() as { id: string; md5Checksum: string };
                if (res.status === 308) {
                    const r = res.headers.get('range');
                    offset = r ? +r.split('-')[1] + 1 : 0;
                    failures = 0;
                    onProgress?.(Math.floor((offset / size) * 100));
                    continue;
                }
                if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`chunk ${res.status}: ${await res.text()}`), { fatal: true });
            } catch (e: any) {
                if (e.fatal) throw e;
            }
            if (++failures > 8) throw new Error(`upload of ${name} failed after repeated errors`);
            await new Promise(r => setTimeout(r, Math.min(60_000, 2000 * 2 ** failures)));
            const o = await serverOffset().catch(() => offset);
            if (o === 'done') {
                const f = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name = '${name}' and '${parentId}' in parents and trashed = false`)}&fields=files(id,md5Checksum)`,
                    { headers: { Authorization: `Bearer ${await token()}` } }).then(r => r.json()) as any;
                return f.files[0];
            }
            offset = o;
        }
    } finally {
        fs.closeSync(fd);
    }
}

/** Pick the next free zip name for a date in its folder (_RAF.zip, _RAF_2.zip, …). */
async function nextZipName(drive: drive_v3.Drive, folderId: string, date: string): Promise<string> {
    const base = `${RAW_ZIP_PREFIX}_${date}_RAF`;
    const res = await drive.files.list({ q: `'${folderId}' in parents and trashed = false and name contains '${base}'`, fields: 'files(name)' });
    const taken = new Set((res.data.files ?? []).map(f => f.name));
    for (let n = 1; ; n++) {
        const name = n === 1 ? `${base}.zip` : `${base}_${n}.zip`;
        if (!taken.has(name)) return name;
    }
}

/**
 * Zip one date's RAFs, upload zip + manifest into `folderId`, verify md5.
 * Returns the manifest entries on success; throws (leaving local files alone) on failure.
 */
export async function zipAndUploadDate(
    drive: drive_v3.Drive, auth: OAuth2Client, files: string[], date: string, folderId: string,
    zipName?: string,
): Promise<{ zipName: string; entries: ManifestEntry[] }> {
    const entries: ManifestEntry[] = [];
    for (const f of files) entries.push({ name: path.basename(f), size: fs.statSync(f).size, md5: await md5OfFileStream(f) });

    const name = zipName ?? await nextZipName(drive, folderId, date);
    const zipPath = path.join(os.tmpdir(), `claptrop-${process.pid}-${name}`);
    try {
        console.log(`  Zipping ${files.length} RAF(s) for ${date} → ${name}`);
        buildZip(files, zipPath);
        const sum = await md5OfFileStream(zipPath);
        let last = -10;
        const up = await uploadResumable(auth, zipPath, name, folderId, 'application/zip', pct => {
            if (pct >= last + 10) { console.log(`    ${name}: ${pct}%`); last = pct; }
        });
        if (up.md5Checksum !== sum) throw new Error(`Drive md5 ${up.md5Checksum} != local ${sum} for ${name}`);

        const manifest = JSON.stringify({ zip: name, zipId: up.id, date, createdAt: new Date().toISOString(), entries }, null, 1);
        // The zip is already up; losing the manifest to one 502 would hide it from dedup.
        for (let attempt = 1; ; attempt++) {
            try {
                await drive.files.create({
                    requestBody: { name: name + MANIFEST_SUFFIX, parents: [folderId], mimeType: 'application/json' },
                    media: { mimeType: 'application/json', body: manifest },
                });
                break;
            } catch (e: any) {
                const code = e?.code ?? e?.response?.status;
                if (attempt >= 8 || (code && code < 500 && code !== 429)) throw new Error(`manifest for ${name} (zip ${up.id} is uploaded): ${String(e?.message).slice(0, 200)}`);
                await new Promise(r => setTimeout(r, Math.min(60_000, 2000 * 2 ** attempt)));
            }
        }
        console.log(`  ✅ ${name} uploaded + verified (${entries.length} RAFs)`);
        return { zipName: name, entries };
    } finally {
        if (fs.existsSync(zipPath)) fs.rmSync(zipPath);
    }
}
