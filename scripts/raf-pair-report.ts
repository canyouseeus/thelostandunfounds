/**
 * raf-pair-report.ts — READ-ONLY. For every JPG in the JPG archive, find its RAF twin
 * in the RAW archive, and report per library folder (HOTEL VEGAS, …) how many pair.
 *
 * Pairing, strongest first:
 *   1. camera name — both files trace back (via claptrop-rename-log / retrograde-log)
 *      to the same DSCFnnnn stem on the same date;
 *   2. capture time — same EXIF second, accepted only when that second is unique on
 *      both sides (bursts are skipped, never guessed).
 * RAFs are seen loose and inside per-date zips (via their .manifest.json).
 *
 *   node_modules/.bin/tsx scripts/raf-pair-report.ts [--out report.json]
 */
import { google, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { readManifest, MANIFEST_SUFFIX } from './drive-raw-zip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const JPG_ARCHIVE = '1Ouha3XJOQJtgB8RxQDwKdDs5ryADYxD4';
const RAW_ARCHIVE = '1BMLrQ6JhHOW7osSZSxl8-Ve4nBAzrPEV';
const FOLDER = 'application/vnd.google-apps.folder';
const OUT = (() => { const i = process.argv.indexOf('--out'); return i !== -1 ? process.argv[i + 1] : null; })();

// ── name lineage from the logs: final name → camera stem ────────────────────
const parent = new Map<string, string>();   // renamed(lower) → original
for (const f of ['claptrop-rename-log.json', 'claptrop-retrograde-log.json']) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    for (const e of JSON.parse(fs.readFileSync(p, 'utf8'))) if (e.original && e.renamed) parent.set(String(e.renamed).toLowerCase(), String(e.original));
}
const stem = (n: string) => n.replace(/\.[^.]+$/, '').toLowerCase();
function cameraStem(name: string): string | null {
    let cur = name;
    for (let hop = 0; hop < 6; hop++) {
        if (/^dscf\d{4}/i.test(cur) || /^(img|_dsf|dsc)_?\d{3,}/i.test(cur)) return stem(cur).match(/^[a-z_]+\d+/)![0];
        const prev = parent.get(cur.toLowerCase()) ?? parent.get(stem(cur) + '.jpg') ?? null;
        if (!prev) return null;
        cur = prev;
    }
    return null;
}
const dateOf = (n: string) => n.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

async function retry<T>(fn: () => Promise<T>): Promise<T> {
    for (let i = 1; ; i++) {
        try { return await fn(); } catch (e: any) {
            const c = e?.code ?? e?.response?.status;
            if (i >= 6 || (c && c < 500 && c !== 429 && c !== 403)) throw e;
            await new Promise(r => setTimeout(r, 1000 * 2 ** i));
        }
    }
}
type F = drive_v3.Schema$File & { top: string };
async function walk(root: string, onFile: (f: F) => void | Promise<void>) {
    const go = async (id: string, top: string) => {
        let tok: string | undefined;
        do {
            const r = await retry(() => drive.files.list({
                q: `'${id}' in parents and trashed = false`, pageSize: 1000, ...(tok ? { pageToken: tok } : {}),
                fields: 'nextPageToken, files(id,name,mimeType,size,imageMediaMetadata(time))',
            }));
            for (const f of r.data.files ?? []) {
                if (f.mimeType === FOLDER) await go(f.id!, top || f.name!);
                else await onFile({ ...f, top: top || '(archive root)' });
            }
            tok = r.data.nextPageToken ?? undefined;
        } while (tok);
    };
    await go(root, '');
}

interface Raf { name: string; where: string; zipId?: string; fileId?: string; key?: string; time?: string }
async function main() {
    console.log(`Name lineage entries from logs: ${parent.size}`);
    const jpgs: (F & { key?: string; t?: string })[] = [];
    await walk(JPG_ARCHIVE, f => {
        if (!/\.(jpe?g)$/i.test(f.name ?? '')) return;
        const cs = cameraStem(f.name!), d = dateOf(f.name!);
        jpgs.push({ ...f, key: cs && d ? `${d}|${cs}` : undefined, t: f.imageMediaMetadata?.time ?? undefined });
    });
    console.log(`JPGs: ${jpgs.length}`);

    const rafs: Raf[] = [];
    const manifests: { id: string; zip: string }[] = [];
    await walk(RAW_ARCHIVE, f => {
        if (/\.raf$/i.test(f.name ?? '')) {
            const cs = cameraStem(f.name!), d = dateOf(f.name!);
            rafs.push({ name: f.name!, where: f.top, fileId: f.id!, key: cs && d ? `${d}|${cs}` : undefined, time: f.imageMediaMetadata?.time ?? undefined });
        } else if (f.name?.endsWith(MANIFEST_SUFFIX)) manifests.push({ id: f.id!, zip: f.name.slice(0, -MANIFEST_SUFFIX.length) });
    });
    for (const m of manifests) {
        for (const e of await readManifest(drive, m.id)) {
            const cs = cameraStem(e.name), d = dateOf(e.name);
            rafs.push({ name: e.name, where: `zip ${m.zip}`, zipId: m.id, key: cs && d ? `${d}|${cs}` : undefined });
        }
    }
    console.log(`RAFs: ${rafs.length} (${rafs.filter(r => r.zipId).length} inside ${manifests.length} zips)`);

    const byKey = new Map<string, Raf[]>(), byTime = new Map<string, Raf[]>();
    for (const r of rafs) {
        if (r.key) (byKey.get(r.key) ?? byKey.set(r.key, []).get(r.key)!).push(r);
        if (r.time) (byTime.get(r.time) ?? byTime.set(r.time, []).get(r.time)!).push(r);
    }
    const jpgTimeCount = new Map<string, number>();
    for (const j of jpgs) if (j.t) jpgTimeCount.set(j.t, (jpgTimeCount.get(j.t) ?? 0) + 1);

    const perLib: Record<string, { jpgs: number; byName: number; byTime: number; none: number }> = {};
    const pairs: { library: string; jpg: string; jpgId: string; raf: string; rafWhere: string; how: string }[] = [];
    const pairedRaf = new Set<Raf>();
    for (const j of jpgs) {
        const L = (perLib[j.top] ??= { jpgs: 0, byName: 0, byTime: 0, none: 0 });
        L.jpgs++;
        let hit: Raf | undefined, how = '';
        const k = j.key ? byKey.get(j.key) : undefined;
        if (k?.length === 1) { hit = k[0]; how = 'camera-name'; }
        else if (j.t && jpgTimeCount.get(j.t) === 1 && byTime.get(j.t)?.length === 1) { hit = byTime.get(j.t)![0]; how = 'capture-time'; }
        if (hit) { how === 'camera-name' ? L.byName++ : L.byTime++; pairedRaf.add(hit); pairs.push({ library: j.top, jpg: j.name!, jpgId: j.id!, raf: hit.name, rafWhere: hit.where, how }); }
        else L.none++;
    }

    console.log('\nPer library (JPG folder) — JPGs / RAF found by camera name / by capture time / no RAF found');
    for (const [lib, s] of Object.entries(perLib).sort((a, b) => b[1].jpgs - a[1].jpgs))
        console.log(`  ${lib.padEnd(34)} ${String(s.jpgs).padStart(6)}  ${String(s.byName).padStart(6)}  ${String(s.byTime).padStart(6)}  ${String(s.none).padStart(6)}`);
    console.log(`\nRAFs with a JPG twin: ${pairedRaf.size} / ${rafs.length}; RAFs with no JPG found: ${rafs.length - pairedRaf.size}`);
    console.log(`RAFs traceable to a camera name: ${rafs.filter(r => r.key).length}; with capture time: ${rafs.filter(r => r.time).length}`);
    if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ perLib, pairs }, null, 1)); console.log(`Wrote ${OUT}`); }
}
main().catch(e => { console.error(e); process.exit(1); });
