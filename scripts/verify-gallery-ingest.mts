/**
 * Harness for live event ingest (lib/api-handlers/_gallery-ingest.ts).
 *
 * An ingest key is handed to an FTP relay or a laptop at a venue, so the thing
 * worth proving is what it can NOT do: write into another gallery, outlive a
 * revoke, claim a Drive file outside its gallery's inbox, or put anything in
 * front of guests. Uploads must wait as pending until the owner publishes;
 * discard must delete the Drive file, not keep it; a published photo must
 * carry the sync fingerprint so the scheduled sync leaves it alone.
 *
 * Drives the real functions against an in-memory PostgREST stub, with the
 * Google calls swapped out through ingestDeps.
 * Run: npx tsx scripts/verify-gallery-ingest.mts
 */
import { verifyAdmin } from '../lib/api-handlers/_admin-auth.js';
import {
    completeUpload,
    discardPending,
    hashIngestKey,
    HttpError,
    ingestDeps,
    listInbox,
    mintIngestKey,
    previewPending,
    publishPending,
    resolveIngestCaller,
    revokeIngestKey,
    startUpload,
} from '../lib/api-handlers/_gallery-ingest.js';

// verifyAdmin must say no to an unauthenticated request. With these unset it
// cannot verify a session or match a secret, and a non-localhost host rules
// out the local-dev pass.
delete process.env.ADMIN_SECRET;
delete process.env.SUPABASE_URL;
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

type Row = Record<string, any>;
const db: Record<string, Row[]> = {
    photo_libraries: [
        { id: 'lib-a', slug: 'event-a', name: 'Event A', google_drive_folder_id: 'folder-a', live_mode: true },
        { id: 'lib-b', slug: 'event-b', name: 'Event B', google_drive_folder_id: 'folder-b', live_mode: false },
    ],
    gallery_ingest_keys: [],
    gallery_live_inboxes: [],
    gallery_ingest_pending: [],
    photos: [],
    tags: [],
    photo_tags: [],
};
let seq = 0;

function makeSupabase() {
    return {
        from(table: string) {
            const rows = () => (db[table] ??= []);
            const q: any = {
                op: 'select', payload: null as any, filters: [] as Array<(r: Row) => boolean>, _single: false,
                select() { return q; },
                eq(c: string, v: any) { q.filters.push((r: Row) => r[c] === v); return q; },
                in(c: string, v: any[]) { q.filters.push((r: Row) => v.includes(r[c])); return q; },
                is(c: string, v: any) { q.filters.push((r: Row) => (r[c] ?? null) === v); return q; },
                order() { return q; },
                range() { return q; },
                limit() { return q; },
                insert(p: any) { q.op = 'insert'; q.payload = p; return q; },
                update(p: any) { q.op = 'update'; q.payload = p; return q; },
                upsert(p: any) { q.op = 'upsert'; q.payload = p; return q; },
                delete() { q.op = 'delete'; return q; },
                single() { q._single = true; return q; },
                maybeSingle() { q._single = true; return q; },
                then(res: any, rej: any) { return Promise.resolve(run()).then(res, rej); },
            };

            function match(r: Row) { return q.filters.every((f: any) => f(r)); }
            function out(list: Row[]) {
                if (q._single) return { data: list[0] ?? null, error: null };
                return { data: list, error: null };
            }
            function run() {
                if (q.op === 'select') return out(rows().filter(match));
                if (q.op === 'insert') {
                    const items = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((p: Row) => ({ id: `${table}-${++seq}`, ...p }));
                    if (table === 'photos' && items.some((i: Row) => rows().some(r => r.google_drive_file_id === i.google_drive_file_id))) {
                        return { data: null, error: { message: 'duplicate key value violates unique constraint photos_google_drive_file_id_key' } };
                    }
                    if (table === 'gallery_ingest_pending' && items.some((i: Row) => rows().some(r => r.drive_file_id === i.drive_file_id))) {
                        return { data: null, error: { message: 'duplicate key value violates unique constraint' } };
                    }
                    if (table === 'tags' && items.some((i: Row) => rows().some(r => r.slug === i.slug))) {
                        return { data: null, error: { message: 'duplicate tag slug' } };
                    }
                    rows().push(...items);
                    return out(items);
                }
                if (q.op === 'update') {
                    const hit = rows().filter(match);
                    for (const r of hit) Object.assign(r, q.payload);
                    return out(hit);
                }
                if (q.op === 'delete') {
                    const keep = rows().filter(r => !match(r));
                    const gone = rows().length - keep.length;
                    db[table] = keep;
                    return { data: null, error: null, count: gone };
                }
                if (q.op === 'upsert') {
                    for (const p of q.payload as Row[]) {
                        if (!rows().some(r => r.photo_id === p.photo_id && r.tag_id === p.tag_id)) rows().push(p);
                    }
                    return { data: null, error: null };
                }
                throw new Error(`stub: unhandled op ${q.op}`);
            }
            return q;
        },
    } as any;
}

const supabase = makeSupabase();
const req = (authorization?: string) =>
    ({ headers: { host: 'www.thelostandunfounds.com', ...(authorization ? { authorization } : {}) } }) as any;

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
}
async function rejects(name: string, fn: () => Promise<unknown>, status: number) {
    try {
        await fn();
        check(name, false, `expected HTTP ${status}, call succeeded`);
    } catch (err: any) {
        check(name, err instanceof HttpError && err.status === status, `got ${err?.status ?? err?.message}`);
    }
}

// --- Keys ---------------------------------------------------------------------

const minted = await mintIngestKey(supabase, 'event-a', 'Canon FTP relay');
const stored = db.gallery_ingest_keys[0];
check('mint returns a tlu_live_ key', minted.key.startsWith('tlu_live_') && minted.key.length > 40);
check('only the hash is stored', stored.key_hash === hashIngestKey(minted.key) && !JSON.stringify(stored).includes(minted.key));

const callerA = await resolveIngestCaller(req(`Bearer ${minted.key}`), supabase, 'event-b');
check('a key writes to its own gallery even when the body names another', callerA.library.id === 'lib-a', callerA.library.slug);

await rejects('an unknown key is refused', () => resolveIngestCaller(req('Bearer tlu_live_not-a-real-key-000000000000'), supabase, 'event-a'), 401);
await rejects('no credentials is refused (verifyAdmin says no)', () => resolveIngestCaller(req(), supabase, 'event-a'), 401);
await rejects('a non-key bearer is not an admin session', () => resolveIngestCaller(req('Bearer some-random-jwt'), supabase, 'event-a'), 401);
check('an ingest key is not an admin credential', !(await verifyAdmin(req(`Bearer ${minted.key}`))));
await rejects('revoking through another gallery is refused', () => revokeIngestKey(supabase, 'event-b', stored.id), 404);

// --- Drive stubs -------------------------------------------------------------

const driveFiles: Record<string, any> = {};
const calls = { created: [] as string[], moved: [] as string[], deleted: [] as string[] };
function putFile(id: string, parents: string[], extra: Record<string, any> = {}) {
    driveFiles[id] = { id, name: `${id}.JPG`, mimeType: 'image/jpeg', parents, trashed: false,
        createdTime: '2026-10-24T02:00:05Z', modifiedTime: '2026-10-24T02:00:05Z', ...extra };
}
let failDelete: number | null = null;
ingestDeps.createFolder = async (name: string) => {
    const id = `inbox-${calls.created.length + 1}`;
    calls.created.push(name);
    return id;
};
ingestDeps.getFile = async (id: string) => {
    if (!driveFiles[id]) throw Object.assign(new Error('File not found'), { code: 404 });
    return driveFiles[id];
};
ingestDeps.moveFile = async (id: string, to: string, from: string) => {
    const f = driveFiles[id];
    if (!f || !f.parents.includes(from)) throw Object.assign(new Error('not in that folder'), { code: 400 });
    f.parents = f.parents.filter((p: string) => p !== from).concat(to);
    calls.moved.push(id);
    return f;
};
ingestDeps.deleteFile = async (id: string) => {
    if (failDelete) throw Object.assign(new Error('Drive is down'), { code: failDelete });
    if (!driveFiles[id]) throw Object.assign(new Error('File not found'), { code: 404 });
    delete driveFiles[id];
    calls.deleted.push(id);
};
ingestDeps.downloadFile = async () => { throw new Error('preview download should not run in these checks'); };

// --- ingest-start -------------------------------------------------------------

let sentInit: any = null;
ingestDeps.getAccessToken = async () => 'stub-token';
ingestDeps.fetch = (async (url: any, init: any) => {
    sentInit = { url: String(url), ...init, body: JSON.parse(init.body) };
    return new Response(null, { status: 200, headers: { location: 'https://upload.example/session-1' } });
}) as any;

await rejects('a video is refused', () => startUpload(supabase, callerA, { fileName: 'clip.mp4', mimeType: 'video/mp4', size: 10 }), 400);
await rejects('a missing size is refused', () => startUpload(supabase, callerA, { fileName: 'a.jpg', mimeType: 'image/jpeg' }), 400);
await rejects('over 200MB is refused', () => startUpload(supabase, callerA, { fileName: 'a.jpg', mimeType: 'image/jpeg', size: 201 * 1024 * 1024 }), 413);

const started = await startUpload(supabase, callerA, { fileName: '../IMG_0001.JPG', mimeType: 'image/jpeg', size: 12_000_000 }, 'https://www.thelostandunfounds.com');
const inboxA = db.gallery_live_inboxes.find(r => r.library_id === 'lib-a')?.drive_folder_id;
check('first upload creates the gallery\'s inbox', !!inboxA && calls.created.length === 1, calls.created[0]);
check('upload goes to the INBOX, not the gallery folder', JSON.stringify(sentInit.body.parents) === JSON.stringify([inboxA]), JSON.stringify(sentInit.body.parents));
check('session URL is returned', started.uploadUrl === 'https://upload.example/session-1');
check('file name cannot carry a path', !started.fileName.includes('/'), started.fileName);
check('declared length is sent to Google', sentInit.headers['X-Upload-Content-Length'] === '12000000');
check('browser origin is forwarded for CORS', sentInit.headers.Origin === 'https://www.thelostandunfounds.com');
await startUpload(supabase, callerA, { fileName: 'b.jpg', mimeType: 'image/jpeg', size: 10 });
check('the inbox is reused, not re-created', calls.created.length === 1 && db.gallery_live_inboxes.length === 1);

ingestDeps.fetch = (async () => new Response('{"error":{"message":"Insufficient Permission"}}', { status: 403 })) as any;
await rejects('a Google refusal surfaces as 502, not success', () => startUpload(supabase, callerA, { fileName: 'a.jpg', mimeType: 'image/jpeg', size: 10 }), 502);

// --- ingest-complete: lands as pending, never public ---------------------------

putFile('good-0001-abc', [inboxA!], { name: 'DSCF0001.JPG', imageMediaMetadata: { time: '2026:10:24 01:59:58' } });
putFile('good-0002-abc', [inboxA!]);
putFile('good-0003-abc', [inboxA!]);
putFile('good-0004-abc', [inboxA!]);
putFile('in-gallery-01', ['folder-a']);
putFile('other-folder1', ['folder-b']);
putFile('trashed-00001', [inboxA!], { trashed: true });
putFile('a-pdf-0000001', [inboxA!], { mimeType: 'application/pdf' });

await rejects('a file already in the gallery folder is not "received"', () => completeUpload(supabase, callerA, { fileId: 'in-gallery-01' }), 403);
await rejects('a file in another folder is refused', () => completeUpload(supabase, callerA, { fileId: 'other-folder1' }), 403);
await rejects('a trashed file is refused', () => completeUpload(supabase, callerA, { fileId: 'trashed-00001' }), 403);
await rejects('a non-photo is refused', () => completeUpload(supabase, callerA, { fileId: 'a-pdf-0000001' }), 400);
await rejects('a missing Drive file is 404', () => completeUpload(supabase, callerA, { fileId: 'nope-00000001' }), 404);
await rejects('a malformed file id is refused', () => completeUpload(supabase, callerA, { fileId: '../x' }), 400);
check('refused calls wrote nothing', db.gallery_ingest_pending.length === 0 && db.photos.length === 0);

for (const id of ['good-0001-abc', 'good-0002-abc', 'good-0003-abc', 'good-0004-abc']) {
    await completeUpload(supabase, callerA, { fileId: id });
}
await completeUpload(supabase, callerA, { fileId: 'good-0001-abc' });
check('received photos are pending', db.gallery_ingest_pending.length === 4, `${db.gallery_ingest_pending.length} pending`);
check('…and NOT in the public photos table', db.photos.length === 0, `${db.photos.length} photo rows`);
check('receiving the same file twice is one pending row', db.gallery_ingest_pending.filter(r => r.drive_file_id === 'good-0001-abc').length === 1);
check('key use is counted once per photo', stored.upload_count === 4, String(stored.upload_count));
check('inbox lists them for review', (await listInbox(supabase, 'event-a')).pending.length === 4);
check('another gallery\'s inbox is empty', (await listInbox(supabase, 'event-b')).pending.length === 0);
await rejects('preview of a non-pending file is refused', () => previewPending(supabase, 'in-gallery-01', 600), 404);

// --- publish ------------------------------------------------------------------

const crossPublish = await publishPending(supabase, 'event-b', ['good-0001-abc']);
check('publishing through another gallery touches nothing', crossPublish.published === 0 && calls.moved.length === 0 && db.photos.length === 0);

const pub = await publishPending(supabase, 'event-a', ['good-0001-abc', 'good-0002-abc']);
const photo = db.photos.find(p => p.google_drive_file_id === 'good-0001-abc');
check('two photos published', pub.published === 2 && db.photos.length === 2, JSON.stringify(pub.results.map(r => r.ok)));
check('published file moved out of the inbox into the gallery folder',
    JSON.stringify(driveFiles['good-0001-abc'].parents) === '["folder-a"]', JSON.stringify(driveFiles['good-0001-abc'].parents));
check('published row is in gallery A', photo?.library_id === 'lib-a');
check('title drops the extension', photo?.title === 'DSCF0001', photo?.title);
check('row carries the sync fingerprint (scheduled sync will skip it)', typeof photo?.metadata?.sync_fingerprint === 'string');
check('capture time from EXIF is kept', photo?.metadata?.date_taken === '2026-10-24T01:59:58.000Z', photo?.metadata?.date_taken);
check('three date tags attached', db.photo_tags.filter(t => t.photo_id === photo?.id).length === 3, db.tags.map(t => t.name).join(', '));
check('published photos leave the inbox', db.gallery_ingest_pending.length === 2);
const again = await publishPending(supabase, 'event-a', ['good-0001-abc']);
check('publishing twice is refused, still one row', again.published === 0 && db.photos.filter(p => p.google_drive_file_id === 'good-0001-abc').length === 1);

// --- discard ------------------------------------------------------------------

const crossDiscard = await discardPending(supabase, 'event-b', ['good-0003-abc']);
check('discarding through another gallery deletes nothing', crossDiscard.discarded === 0 && calls.deleted.length === 0);

failDelete = 500;
const failed = await discardPending(supabase, 'event-a', ['good-0003-abc']);
check('a Drive failure is reported and the photo stays pending', failed.discarded === 0 && !!driveFiles['good-0003-abc']
    && db.gallery_ingest_pending.some(r => r.drive_file_id === 'good-0003-abc'), failed.results[0]?.error);
failDelete = null;

const dis = await discardPending(supabase, 'event-a', ['good-0003-abc']);
check('discard deletes the Drive file', dis.discarded === 1 && !driveFiles['good-0003-abc'] && calls.deleted.includes('good-0003-abc'));
check('…and keeps no record of it', !db.gallery_ingest_pending.some(r => r.drive_file_id === 'good-0003-abc')
    && !db.photos.some(p => p.google_drive_file_id === 'good-0003-abc'));

delete driveFiles['good-0004-abc'];
const gone = await discardPending(supabase, 'event-a', ['good-0004-abc']);
check('a file already gone from Drive still discards cleanly', gone.discarded === 1 && db.gallery_ingest_pending.length === 0);
await rejects('an empty batch is refused', () => discardPending(supabase, 'event-a', []), 400);

// --- revoke -------------------------------------------------------------------

await revokeIngestKey(supabase, 'event-a', stored.id);
await rejects('a revoked key is refused', () => resolveIngestCaller(req(`Bearer ${minted.key}`), supabase, 'event-a'), 401);
await rejects('revoking twice is 404', () => revokeIngestKey(supabase, 'event-a', stored.id), 404);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
