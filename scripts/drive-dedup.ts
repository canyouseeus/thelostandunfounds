/**
 * drive-dedup.ts — find and trash byte-identical duplicate media in Google Drive.
 *
 * Duplicates are grouped by md5Checksum + size (identical content), across the
 * whole Drive owned by the OAuth user — not by filename or size alone.
 *
 * Keeper rule per group:
 *   1. Every copy whose ID is in the protected list (gallery/site references) is kept.
 *   2. If none is protected, the oldest copy is kept.
 *   Only unprotected extra copies are ever trashed.
 *
 * Usage:
 *   node_modules/.bin/tsx scripts/drive-dedup.ts --protected <ids.json> --plan <plan.json>
 *       Dry run: scans Drive, prints quota + summary, writes the plan. Changes nothing.
 *   node_modules/.bin/tsx scripts/drive-dedup.ts --execute <plan.json>
 *       Trashes exactly the files listed in a reviewed plan (recoverable 30 days).
 *
 * Trashed files still count against quota until the Drive trash is emptied.
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.error('Missing OAuth2 credentials in .env.local');
    process.exit(1);
}
const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : undefined; };
const EXECUTE_PLAN = flag('--execute');
const PROTECTED    = flag('--protected');
const PLAN_OUT     = flag('--plan');
const INDEX_OUT    = flag('--index'); // write { "md5:size": [fileId…] } for local-vs-Drive checks

const MEDIA = /^(image\/|video\/)|^application\/octet-stream$/;
const MEDIA_EXT = /\.(jpe?g|png|heic|raf|dng|cr2|cr3|nef|arw|mov|mp4|m4v)$/i;
const fmt = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`;

interface DFile { id: string; name: string; size: number; md5: string; createdTime: string; parents: string[]; mimeType: string }
interface PlanEntry { id: string; name: string; size: number; md5: string; keptIds: string[] }

async function retry<T>(fn: () => Promise<T>, label: string, tries = 5): Promise<T> {
    for (let i = 1; ; i++) {
        try { return await fn(); }
        catch (e: any) {
            const code = e?.code ?? e?.response?.status;
            if (i >= tries || !(code === 429 || code === 403 || code >= 500)) throw e;
            await new Promise(r => setTimeout(r, 1000 * 2 ** i));
            console.warn(`  retry ${i} ${label} (${code})`);
        }
    }
}

async function quota() {
    const r = await retry(() => drive.about.get({ fields: 'storageQuota, user(emailAddress)' }), 'about');
    const q = r.data.storageQuota!;
    console.log(`Account: ${r.data.user?.emailAddress}`);
    console.log(`Quota: ${fmt(+q.usage!)} used of ${q.limit ? fmt(+q.limit) : 'unlimited'} ` +
        `(Drive ${fmt(+q.usageInDrive!)}, in trash ${fmt(+q.usageInDriveTrash!)})`);
}

async function listOwned(trashed: boolean): Promise<DFile[]> {
    const out: DFile[] = [];
    let pageToken: string | undefined;
    do {
        const res = await retry(() => drive.files.list({
            q: `'me' in owners and trashed = ${trashed} and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'nextPageToken, files(id, name, size, md5Checksum, createdTime, parents, mimeType)',
            pageSize: 1000,
            ...(pageToken ? { pageToken } : {}),
        }), 'list');
        for (const f of res.data.files || []) {
            if (!f.id || !f.md5Checksum || !f.size) continue;
            out.push({ id: f.id, name: f.name || '', size: +f.size, md5: f.md5Checksum,
                createdTime: f.createdTime || '', parents: f.parents || [], mimeType: f.mimeType || '' });
        }
        pageToken = res.data.nextPageToken ?? undefined;
        if (out.length % 5000 < 1000) process.stdout.write(`\r  scanned ${out.length} files…`);
    } while (pageToken);
    process.stdout.write('\n');
    return out;
}

async function dryRun() {
    if (!PROTECTED || !PLAN_OUT) {
        console.error('Dry run needs --protected <ids.json> and --plan <plan.json>');
        process.exit(1);
    }
    const protectedIds = new Set<string>(JSON.parse(fs.readFileSync(PROTECTED, 'utf-8')));
    if (protectedIds.size === 0) { console.error('Protected ID list is empty — refusing to plan.'); process.exit(1); }
    console.log(`Protected IDs loaded: ${protectedIds.size}`);
    await quota();

    console.log('Scanning Drive…');
    const files = await listOwned(false);
    const media = files.filter(f => MEDIA.test(f.mimeType) || MEDIA_EXT.test(f.name));
    console.log(`Owned files with content: ${files.length} (media: ${media.length}, ${fmt(media.reduce((s, f) => s + f.size, 0))})`);

    const groups = new Map<string, DFile[]>();
    for (const f of media) {
        const k = `${f.md5}:${f.size}`;
        (groups.get(k) ?? groups.set(k, []).get(k)!).push(f);
    }

    const plan: PlanEntry[] = [];
    let groupCount = 0, protectedSeen = 0;
    for (const g of groups.values()) {
        if (g.length < 2) continue;
        groupCount++;
        g.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
        const prot = g.filter(f => protectedIds.has(f.id));
        protectedSeen += prot.length;
        const keep = prot.length ? prot : [g[0]];
        const keepIds = keep.map(f => f.id);
        for (const f of g) {
            if (keepIds.includes(f.id)) continue;
            if (protectedIds.has(f.id)) throw new Error(`BUG: protected file ${f.id} planned for trash`);
            plan.push({ id: f.id, name: f.name, size: f.size, md5: f.md5, keptIds: keepIds });
        }
    }

    const freed = plan.reduce((s, p) => s + p.size, 0);
    fs.writeFileSync(PLAN_OUT, JSON.stringify(plan, null, 1));
    console.log(`\nDuplicate groups: ${groupCount}`);
    console.log(`Copies to trash: ${plan.length} (${fmt(freed)})`);
    console.log(`Protected copies kept in those groups: ${protectedSeen}`);
    const byExt = new Map<string, [number, number]>();
    for (const p of plan) {
        const e = (path.extname(p.name) || '(none)').toLowerCase();
        const v = byExt.get(e) ?? [0, 0]; v[0]++; v[1] += p.size; byExt.set(e, v);
    }
    for (const [e, [n, b]] of [...byExt].sort((a, b) => b[1][1] - a[1][1])) console.log(`  ${e.padEnd(8)} ${String(n).padStart(6)}  ${fmt(b)}`);
    console.log('\nSample:');
    for (const p of plan.slice(0, 10)) console.log(`  TRASH ${p.name} (${p.id}) — keeps ${p.keptIds.join(', ')}`);
    console.log(`\nPlan written to ${PLAN_OUT}. Nothing was changed.`);
}

async function execute(planFile: string) {
    const plan: PlanEntry[] = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
    console.log(`Executing plan: ${plan.length} files`);
    await quota();
    let ok = 0, skipped = 0, fail = 0;
    const queue = [...plan];
    const worker = async () => {
        for (let p; (p = queue.shift()); ) {
            try {
                // Re-check a keeper still exists before trashing its duplicate.
                const alive = await Promise.all(p.keptIds.map(id => retry(() =>
                    drive.files.get({ fileId: id, fields: 'trashed, md5Checksum' }), 'keeper')
                    .then(r => !r.data.trashed && r.data.md5Checksum === p.md5).catch(() => false)));
                if (!alive.some(Boolean)) { skipped++; console.warn(`  skip ${p.name}: no live keeper`); continue; }
                await retry(() => drive.files.update({ fileId: p.id, requestBody: { trashed: true } }), `trash ${p.id}`);
                ok++;
                if (ok % 100 === 0) console.log(`  trashed ${ok}/${plan.length}`);
            } catch (e: any) { fail++; console.error(`  ✗ ${p.name} (${p.id}): ${e.message}`); }
        }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    console.log(`\nDone: ${ok} trashed, ${skipped} skipped, ${fail} failed.`);
    await quota();
}

async function writeIndex(out: string) {
    const index: Record<string, string[]> = {};
    for (const f of await listOwned(false)) (index[`${f.md5}:${f.size}`] ??= []).push(f.id);
    fs.writeFileSync(out, JSON.stringify(index));
    console.log(`Index of ${Object.keys(index).length} distinct files written to ${out}`);
}

(EXECUTE_PLAN ? execute(EXECUTE_PLAN) : INDEX_OUT ? writeIndex(INDEX_OUT) : dryRun()).catch(e => { console.error(e); process.exit(1); });
