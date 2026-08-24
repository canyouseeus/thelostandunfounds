/**
 * Harness for the gallery sync's skip-unchanged path.
 *
 * On 2026-08-24 this job was issuing ~3M PostgREST requests a day against a
 * 15,790-row table while producing zero net writes: it re-walked the same
 * folder every five minutes and rewrote every row it saw. The regression this
 * guards is not "the sync is wrong" — the sync was always correct — it is "the
 * sync is not free when nothing changed."
 *
 * Drives the real processFolder() against stub Drive/PostgREST clients and
 * counts writes. Run: npx tsx scripts/verify-sync-skip.mts
 */
import { processFolder } from '../lib/api-handlers/_photo-sync-utils.js';

type Row = Record<string, any>;

interface Counts { select: number; update: number; insert: number; upsert: number }

function newCounts(): Counts { return { select: 0, update: 0, insert: 0, upsert: 0 }; }
const writes = (c: Counts) => c.update + c.insert + c.upsert;

/** Minimal thenable PostgREST-shaped stub over an in-memory table set. */
function makeSupabase(db: { photos: Row[]; photo_tags: Row[] }, counts: Counts) {
    let idSeq = db.photos.length;
    return {
        from(table: string) {
            const q: any = {
                _op: null as string | null,
                _payload: null as any,
                _filters: {} as Record<string, any>,
                select() { if (!q._op) q._op = 'select'; return q; },
                eq(c: string, v: any) { q._filters[c] = v; return q; },
                in(c: string, v: any[]) { q._filters[c] = v; return q; },
                update(p: any) { q._op = 'update'; q._payload = p; return q; },
                insert(p: any) { q._op = 'insert'; q._payload = p; return q; },
                upsert(p: any) { q._op = 'upsert'; q._payload = p; return q; },
                single() { q._single = true; return q; },
                maybeSingle() { q._single = true; return q; },
                order() { return q; },
                range() { return q; },
                then(res: any, rej: any) { return Promise.resolve(run()).then(res, rej); },
            };

            function run() {
                if (table === 'photos' && q._op === 'select') {
                    counts.select++;
                    const ids = q._filters['google_drive_file_id'];
                    const want = Array.isArray(ids) ? ids : [ids];
                    const data = db.photos.filter(r => want.includes(r.google_drive_file_id));
                    return { data, error: null };
                }
                if (table === 'photos' && q._op === 'update') {
                    counts.update++;
                    const row = db.photos.find(r => r.google_drive_file_id === q._filters['google_drive_file_id']);
                    if (row) Object.assign(row, q._payload);
                    return { data: row ? { id: row.id } : null, error: row ? null : { message: 'not found' } };
                }
                if (table === 'photos' && q._op === 'insert') {
                    counts.insert++;
                    const row = { id: `photo-${++idSeq}`, ...q._payload };
                    db.photos.push(row);
                    return { data: { id: row.id }, error: null };
                }
                if (table === 'photo_tags' && q._op === 'upsert') {
                    counts.upsert++;
                    for (const r of q._payload) {
                        if (!db.photo_tags.some(t => t.photo_id === r.photo_id && t.tag_id === r.tag_id)) {
                            db.photo_tags.push(r);
                        }
                    }
                    return { data: null, error: null };
                }
                // Any tag insert would mean the cache missed — surface it loudly
                // rather than silently counting as a write.
                throw new Error(`unexpected stub op: ${table}.${q._op}`);
            }
            return q;
        },
    };
}

const FOLDER = 'folder-root';
const N = 500;

const driveFiles = Array.from({ length: N }, (_, i) => ({
    id: `drive-${i}`,
    name: `IMG_${String(i).padStart(4, '0')}.jpg`,
    mimeType: 'image/jpeg',
    thumbnailLink: `https://drive.example/thumb/${i}=s220`,
    createdTime: '2026-03-04T10:00:00.000Z',
    modifiedTime: '2026-03-04T10:00:00.000Z',
    imageMediaMetadata: { width: 4000, height: 3000 },
}));

const drive: any = {
    files: {
        list: async () => ({ data: { files: driveFiles, nextPageToken: undefined } }),
    },
};

// Pre-seed the tag cache with every collection tag the date path will ask for,
// so ensureTag never needs to write and the counts stay attributable.
const tagCache = new Map<string, any>();
for (const slug of ['collection-2026', 'collection-march', 'collection-march-2026']) {
    tagCache.set(slug, { id: `tag-${slug}`, type: 'collection', metadata: null });
}

function makeCtx(db: any, counts: Counts) {
    return {
        drive,
        supabase: makeSupabase(db, counts) as any,
        library: { id: 'lib-1' },
        tagCache,
        venues: [],
        neighborhoods: [],
        stats: { synced: 0, skipped: 0, foldersVisited: 0, tagsCreated: 0 },
        seenFileIds: new Set<string>(),
        limit: Number.MAX_SAFE_INTEGER,
        deadline: Date.now() + 120_000,
        timedOut: false,
    } as any;
}

const db = { photos: [] as Row[], photo_tags: [] as Row[] };

// ---- Pass 1: cold. Every photo is new, so every photo must be written. ----
const c1 = newCounts();
const ctx1 = makeCtx(db, c1);
await processFolder(ctx1, FOLDER, null, 0);

// ---- Pass 2: nothing changed in Drive. Must perform zero writes. ----
const c2 = newCounts();
const ctx2 = makeCtx(db, c2);
await processFolder(ctx2, FOLDER, null, 0);

// ---- Pass 3: one file edited in Drive. Must write exactly that one. ----
driveFiles[7].modifiedTime = '2026-08-24T12:00:00.000Z';
const c3 = newCounts();
const ctx3 = makeCtx(db, c3);
await processFolder(ctx3, FOLDER, null, 0);

// ---- Pass 4: a photo re-homed to another library. Drive is untouched, but the
// row is filed under the wrong library, so it must be re-synced rather than
// skipped — photos.google_drive_file_id is globally unique, and letting this
// fall through to an insert would fail that constraint on every pass forever.
db.photos.find(r => r.google_drive_file_id === 'drive-11')!.library_id = 'lib-OTHER';
const c4 = newCounts();
const ctx4 = makeCtx(db, c4);
await processFolder(ctx4, FOLDER, null, 0);

const results = [
    ['pass 1 (cold)   ', c1, ctx1],
    ['pass 2 (no-op)  ', c2, ctx2],
    ['pass 3 (1 edit) ', c3, ctx3],
    ['pass 4 (re-home)', c4, ctx4],
] as const;

console.log(`\nDrive folder: ${N} photos\n`);
console.log('pass              synced  skipped  selects  writes  (upd/ins/tags)');
for (const [label, c, ctx] of results) {
    console.log(
        `${label}  ${String(ctx.stats.synced).padStart(6)}  ${String(ctx.stats.skipped).padStart(7)}` +
        `  ${String(c.select).padStart(7)}  ${String(writes(c)).padStart(6)}` +
        `  (${c.update}/${c.insert}/${c.upsert})`,
    );
}

const failures: string[] = [];
const check = (cond: boolean, msg: string) => { if (!cond) failures.push(msg); };

check(ctx1.stats.synced === N, `pass 1 should sync all ${N}, synced ${ctx1.stats.synced}`);
check(c1.insert === N, `pass 1 should insert ${N}, inserted ${c1.insert}`);
check(db.photos.length === N, `db should hold ${N} photos, holds ${db.photos.length}`);

check(writes(c2) === 0, `pass 2 must perform ZERO writes, performed ${writes(c2)}`);
check(ctx2.stats.skipped === N, `pass 2 should skip all ${N}, skipped ${ctx2.stats.skipped}`);
check(ctx2.seenFileIds.size === N,
    `pass 2 must still mark all ${N} files seen (orphan cleanup depends on it), marked ${ctx2.seenFileIds.size}`);

check(ctx3.stats.synced === 1, `pass 3 should sync exactly 1, synced ${ctx3.stats.synced}`);
check(c3.update === 1, `pass 3 should issue exactly 1 update, issued ${c3.update}`);
check(ctx3.stats.skipped === N - 1, `pass 3 should skip ${N - 1}, skipped ${ctx3.stats.skipped}`);

check(ctx4.stats.synced === 1, `pass 4 should re-sync exactly the re-homed photo, synced ${ctx4.stats.synced}`);
check(c4.update === 1, `pass 4 should issue exactly 1 update, issued ${c4.update}`);
check(c4.insert === 0, `pass 4 must NOT insert (would violate the unique index), inserted ${c4.insert}`);
check(
    db.photos.find(r => r.google_drive_file_id === 'drive-11')?.library_id === 'lib-1',
    'pass 4 should have re-homed the photo back to lib-1',
);

const before = N * 2;            // pre-fix: 1 GET + 1 PATCH + 1 POST per photo, minus the batched select
const after = c2.select + writes(c2);
console.log(`\nsteady-state requests per pass: was ~${N * 3} (1 GET + 1 PATCH + 1 POST each), now ${after}`);

if (failures.length) {
    console.error('\nFAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}
console.log('\nAll checks passed.\n');
