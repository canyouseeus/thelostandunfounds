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
    createMyLiveGallery,
    listMyGalleries,
    setMyLiveMode,
    verifiedPhotographer,
    discardPending,
    hashIngestKey,
    HttpError,
    ingestDeps,
    listInbox,
    mintIngestKey,
    previewPending,
    publishPending,
    setLiveMode,
    normalizeHandle,
    liveFileName,
    HOUSE_HANDLE,
    relayChunk,
    RELAY_CHUNK_BYTES,
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
    photographers: [
        { id: 'ph-eric', user_id: 'user-eric', name: 'Eric Alvarado', instagram: '@four5_culture', active: true },
        { id: 'ph-old', user_id: 'user-old', name: 'Former Crew', instagram: null, active: false },
        { id: 'ph-itz', user_id: 'user-itz', name: 'Itzamara Villareal', instagram: 'itzography', active: true },
    ],
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

// --- camera roll: publish on arrival ------------------------------------------

putFile('roll-0001-abc', [inboxA!]);
putFile('roll-0002-abc', [inboxA!]);
const photosBefore = db.photos.length;
const pendingBefore = db.gallery_ingest_pending.length;
const roll = await completeUpload(supabase, callerA, { fileId: 'roll-0001-abc', publish: true });
check('a camera-roll upload goes live at once', roll.pending === false && !!roll.photoId
    && db.photos.some(p => p.google_drive_file_id === 'roll-0001-abc' && p.library_id === 'lib-a'), JSON.stringify(roll));
check('…moved out of the inbox into the gallery folder', JSON.stringify(driveFiles['roll-0001-abc'].parents) === '["folder-a"]');
check('…and leaves nothing waiting in the inbox', db.gallery_ingest_pending.length === pendingBefore
    && !db.gallery_ingest_pending.some(r => r.drive_file_id === 'roll-0001-abc'));
check('…carrying the sync fingerprint', typeof db.photos.find(p => p.google_drive_file_id === 'roll-0001-abc')?.metadata?.sync_fingerprint === 'string');
const notReally = await completeUpload(supabase, callerA, { fileId: 'roll-0002-abc', publish: 'true' });
check('only publish: true publishes — anything else waits for review', notReally.pending === true
    && db.photos.length === photosBefore + 1 && db.gallery_ingest_pending.some(r => r.drive_file_id === 'roll-0002-abc'));
await discardPending(supabase, 'event-a', ['roll-0002-abc']);

// --- photographers: their own live galleries ---------------------------------

const TOKENS: Record<string, string> = { 'eric-session': 'user-eric', 'old-session': 'user-old', 'fan-session': 'user-fan', 'itz-session': 'user-itz' };
ingestDeps.sessionUserId = async (t: string) => TOKENS[t] ?? null;
const createdFolders: string[] = [];
ingestDeps.createFolder = async (name: string) => { createdFolders.push(name); return `folder-ph-${createdFolders.length}`; };

const eric = await verifiedPhotographer(req('Bearer eric-session'), supabase);
check('a signed-in crew photographer is recognised', eric?.id === 'ph-eric' && eric.userId === 'user-eric');
check('an inactive photographer is not', (await verifiedPhotographer(req('Bearer old-session'), supabase)) === null);
check('a signed-in non-photographer is not', (await verifiedPhotographer(req('Bearer fan-session'), supabase)) === null);
check('an upload key is not a photographer', (await verifiedPhotographer(req(`Bearer ${minted.key}`), supabase)) === null);

await rejects('a gallery needs a name', () => createMyLiveGallery(supabase, eric!, ' x '), 400);
const mine = await createMyLiveGallery(supabase, eric!, 'Halloween   at Primos');
const mineRow = db.photo_libraries.find(l => l.slug === mine.slug)!;
check('creating makes a live, public gallery owned by the photographer',
    mineRow.owner_id === 'user-eric' && mineRow.live_mode === true && mineRow.is_private === false && mineRow.published === true,
    JSON.stringify({ owner: mineRow.owner_id, live: mineRow.live_mode, private: mineRow.is_private }));
check('…with its own new Drive folder', mineRow.google_drive_folder_id === `folder-ph-${createdFolders.length}`
    && createdFolders.at(-1) === 'Halloween at Primos — Eric Alvarado', createdFolders.at(-1));
check('…a unique slug and their Instagram handle', /^halloween-at-primos-[0-9a-f]{6}$/.test(mine.slug) && mineRow.photographer_handle === '@four5_culture', mine.slug);
const itz = await verifiedPhotographer(req('Bearer itz-session'), supabase);
const itzGallery = await createMyLiveGallery(supabase, itz!, 'Day of the Dead');
check('a handle stored without @ is saved normalized on the gallery', db.photo_libraries.find(l => l.slug === itzGallery.slug)?.photographer_handle === '@itzography');
const again2 = await createMyLiveGallery(supabase, eric!, 'Halloween at Primos');
check('two galleries with the same name get different slugs', again2.slug !== mine.slug);

const listed = await listMyGalleries(supabase, eric!);
check('a photographer lists only their own galleries', listed.galleries.length === 2 && listed.galleries.every((g: any) => db.photo_libraries.find(l => l.id === g.id)?.owner_id === 'user-eric'));

await setMyLiveMode(supabase, eric!, mine.slug, false);
check('they can end live on their own gallery', mineRow.live_mode === false);
await rejects('…but not on someone else\'s', () => setMyLiveMode(supabase, eric!, 'event-a', false), 403);
check('…which stays live', db.photo_libraries.find(l => l.slug === 'event-a')!.live_mode === true);

const ericCaller = await resolveIngestCaller(req('Bearer eric-session'), supabase, mine.slug);
check('they can upload to their own gallery', ericCaller.library.slug === mine.slug && ericCaller.keyId === null);
check('…credited to their own handle', ericCaller.handle === '@four5_culture', String(ericCaller.handle));
await rejects('…but not to someone else\'s', () => resolveIngestCaller(req('Bearer eric-session'), supabase, 'event-a'), 403);
await rejects('an inactive photographer cannot upload', () => resolveIngestCaller(req('Bearer old-session'), supabase, mine.slug), 401);
await rejects('a signed-in fan cannot upload', () => resolveIngestCaller(req('Bearer fan-session'), supabase, mine.slug), 401);

// --- Direct Upload: a gallery created with no Drive link gets one on first upload ---

db.photo_libraries.push({ id: 'lib-direct', slug: 'direct-upload', name: 'HOLLOW33N 26', google_drive_folder_id: null, owner_id: 'user-eric', live_mode: false });
const directRow = db.photo_libraries.find(l => l.id === 'lib-direct')!;
const foldersBefore = createdFolders.length;
await rejects('another photographer cannot upload to a folderless gallery', () => resolveIngestCaller(req('Bearer itz-session'), supabase, 'direct-upload'), 403);
check('…and their attempt creates no Drive folder', createdFolders.length === foldersBefore && directRow.google_drive_folder_id === null, String(directRow.google_drive_folder_id));
const directKey = 'tlu_live_direct-upload-test-key-0000000000000000';
db.gallery_ingest_keys.push({ id: 'key-direct', library_id: 'lib-direct', key_hash: hashIngestKey(directKey), revoked_at: null });
await rejects('an upload key never creates a folder (still 409)', () => resolveIngestCaller(req(`Bearer ${directKey}`), supabase, null), 409);
check('…none was made', createdFolders.length === foldersBefore && directRow.google_drive_folder_id === null);
const directCaller = await resolveIngestCaller(req('Bearer eric-session'), supabase, 'direct-upload');
check('the owner\'s first upload creates the gallery\'s Drive folder and saves it',
    directCaller.library.folderId === `folder-ph-${foldersBefore + 1}` && directRow.google_drive_folder_id === directCaller.library.folderId
    && createdFolders.at(-1) === 'HOLLOW33N 26', `${directCaller.library.folderId} / ${directRow.google_drive_folder_id}`);
const directAgain = await resolveIngestCaller(req('Bearer eric-session'), supabase, 'direct-upload');
check('…later uploads reuse it (one folder, not one per photo)', directAgain.library.folderId === directCaller.library.folderId && createdFolders.length === foldersBefore + 1);

// --- naming: @handle_thelostandunfounds_DATE_location_subject_### -------------

check('handles normalize to @lowercase', normalizeHandle('itzography') === '@itzography' && normalizeHandle('@Four5_Culture') === '@four5_culture'
    && normalizeHandle(null) === null && normalizeHandle('bad handle!') === null && normalizeHandle('  ') === null);

const seqs = new Map<string, number>();
ingestDeps.nextNameSeq = async (_sb: any, prefix: string) => { const n = (seqs.get(prefix) ?? 0) + 1; seqs.set(prefix, n); return n; };
const located: string[] = [];
ingestDeps.locate = async (lat: number, lon: number) => { located.push(`${lat},${lon}`); return 'austin'; };
const realMove = ingestDeps.moveFile;
const renames: Record<string, string | undefined> = {};
ingestDeps.moveFile = async (id: string, to: string, from: string, newName?: string) => {
    renames[id] = newName;
    const f = await realMove(id, to, from);
    if (newName) f.name = newName;
    return f;
};

const adminCaller = { library: callerA.library, keyId: null, handle: HOUSE_HANDLE } as any;
putFile('name-0001-abc', [inboxA!], { name: 'IMG_4412.HEIC', imageMediaMetadata: { time: '2026:10:25 23:41:07', location: { latitude: 30.26, longitude: -97.74 } } });
putFile('name-0002-abc', [inboxA!], { name: 'IMG_4413.JPG', imageMediaMetadata: { time: '2026:10:25 23:41:09' } });
putFile('name-0003-abc', [inboxA!], { name: 'DSCF0042.JPG', createdTime: '2026-10-26T02:00:00Z' });

await completeUpload(supabase, adminCaller, { fileId: 'name-0001-abc', publish: true });
await completeUpload(supabase, adminCaller, { fileId: 'name-0002-abc', publish: true });
check('your upload is named for @tlau.media, capture date, place, gallery, ###',
    renames['name-0001-abc'] === '@tlau.media_thelostandunfounds_2026-10-25_austin_event_a_001.heic', renames['name-0001-abc']);
check('…the next one takes the next number', renames['name-0002-abc'] === '@tlau.media_thelostandunfounds_2026-10-25_austin_event_a_002.jpg', renames['name-0002-abc']);
check('…GPS is looked up for the place; no GPS falls back to austin', located.length === 1 && located[0] === '30.26,-97.74', located.join(' | '));
const named = db.photos.find(p => p.google_drive_file_id === 'name-0001-abc');
check('…the gallery title follows the file name', named?.title === '@tlau.media_thelostandunfounds_2026-10-25_austin_event_a_001', named?.title);
check('…and the place is recorded', named?.location_name === 'austin', named?.location_name);

const ericInA = { library: callerA.library, keyId: 'k', handle: '@four5_culture' } as any;
await completeUpload(supabase, ericInA, { fileId: 'name-0003-abc', publish: true });
check('a crew member\'s upload credits their own handle (no EXIF → upload date)',
    renames['name-0003-abc'] === '@four5_culture_thelostandunfounds_2026-10-26_austin_event_a_001.jpg', renames['name-0003-abc']);

putFile('name-0004-abc', [inboxA!], { name: 'IMG_9.JPG' });
const anon = { library: callerA.library, keyId: 'k2', handle: null } as any;
await completeUpload(supabase, anon, { fileId: 'name-0004-abc', publish: true });
check('nobody credited → keeps its camera name (never guessed)', renames['name-0004-abc'] === undefined
    && db.photos.find(p => p.google_drive_file_id === 'name-0004-abc')?.title === 'IMG_9', String(renames['name-0004-abc']));

putFile('name-0005-abc', [inboxA!], { name: 'IMG_10.JPG' });
const seqFn = ingestDeps.nextNameSeq;
ingestDeps.nextNameSeq = async () => { throw new Error('counter down'); };
await completeUpload(supabase, adminCaller, { fileId: 'name-0005-abc', publish: true });
ingestDeps.nextNameSeq = seqFn;
check('a naming failure still publishes, under the camera name', db.photos.some(p => p.google_drive_file_id === 'name-0005-abc' && p.title === 'IMG_10')
    && renames['name-0005-abc'] === undefined);

putFile('name-0006-abc', [inboxA!], { name: 'AUTO_1.JPG', imageMediaMetadata: { time: '2026:10:25 23:50:00' } });
await completeUpload(supabase, ericInA, { fileId: 'name-0006-abc' });
check('a reviewed photo carries its credit in the inbox', db.gallery_ingest_pending.find(r => r.drive_file_id === 'name-0006-abc')?.credit_handle === '@four5_culture');
await publishPending(supabase, 'event-a', ['name-0006-abc']);
check('…and is named for that person when published later',
    renames['name-0006-abc'] === '@four5_culture_thelostandunfounds_2026-10-25_austin_event_a_001.jpg', renames['name-0006-abc']);
ingestDeps.moveFile = realMove;

// Any source is named: going live gives a house gallery the house credit, and
// a sender with no handle of their own is named for the gallery.
await setLiveMode(supabase, 'event-a', true);
check('going live gives a gallery with no credit the house handle', db.photo_libraries.find(l => l.slug === 'event-a')?.photographer_handle === '@tlau.media');
const ericGalleryHandle = db.photo_libraries.find(l => l.slug === 'event-b')!;
ericGalleryHandle.photographer_handle = '@four5_culture';
await setLiveMode(supabase, 'event-b', true);
check('…but never overwrites a gallery\'s existing credit', ericGalleryHandle.photographer_handle === '@four5_culture');
ericGalleryHandle.photographer_handle = null;
const anonAfter = await resolveIngestCaller(req(`Bearer ${(await mintIngestKey(supabase, 'event-a', 'Walk-in')).key}`), supabase, undefined);
putFile('name-0007-abc', [inboxA!], { name: 'IMG_77.JPG', imageMediaMetadata: { time: '2026:10:25 23:59:00' } });
ingestDeps.moveFile = async (id: string, to: string, from: string, newName?: string) => {
    renames[id] = newName;
    const f = await realMove(id, to, from);
    if (newName) f.name = newName;
    return f;
};
await completeUpload(supabase, anonAfter, { fileId: 'name-0007-abc', publish: true });
check('a sender with no handle is named for the gallery', renames['name-0007-abc'] === '@tlau.media_thelostandunfounds_2026-10-25_austin_event_a_003.jpg', renames['name-0007-abc']);
ingestDeps.moveFile = realMove;

const guestLink = await mintIngestKey(supabase, 'event-a', 'Guest', null, ' @Guest.Shooter ');
check('a guest link credits the handle typed for them', (await resolveIngestCaller(req(`Bearer ${guestLink.key}`), supabase, undefined)).handle === '@guest.shooter');
await rejects('a typed handle that can\'t be a handle is refused', () => mintIngestKey(supabase, 'event-a', 'Guest', null, 'not a handle!'), 400);

// Upload-link credit comes from the crew member chosen when the link was made.
const itzLink = await mintIngestKey(supabase, 'event-a', 'Itz', 'ph-itz');
const itzCaller = await resolveIngestCaller(req(`Bearer ${itzLink.key}`), supabase, undefined);
check('a link made for a crew member credits them (stored without @, used with it)', itzCaller.handle === '@itzography', String(itzCaller.handle));
const noOne = await mintIngestKey(supabase, 'event-a', 'Someone');
check('a link made for nobody credits nobody', (await resolveIngestCaller(req(`Bearer ${noOne.key}`), supabase, undefined)).handle === null);
await rejects('a link can\'t credit someone off the crew list', () => mintIngestKey(supabase, 'event-a', 'x', 'ph-nobody'), 400);
check('your own session credits @tlau.media', HOUSE_HANDLE === '@tlau.media');

// --- chunk relay --------------------------------------------------------------

const SESSION = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc123';
let relayed: any = null;
ingestDeps.fetch = (async (url: any, init: any) => {
    relayed = { url: String(url), ...init };
    const range = init.headers['Content-Range'];
    if (range === 'bytes 0-9/20') return new Response(null, { status: 308, headers: { range: 'bytes=0-9' } });
    return new Response(JSON.stringify({ id: 'relayed-file-01' }), { status: 200 });
}) as any;
const chunk10 = Buffer.from('0123456789');
for (const bad of ['https://evil.example/upload/drive/v3/files?upload_id=x', 'http://www.googleapis.com/upload/drive/v3/files?upload_id=x',
    'https://www.googleapis.com/drive/v3/files?upload_id=x', 'https://www.googleapis.com/upload/drive/v3/files', 'not a url']) {
    relayed = null;
    await rejects(`relay refuses ${bad.slice(0, 48)}`, () => relayChunk(bad, 'bytes 0-9/20', chunk10), 400);
    check(`…and sends nothing for it`, relayed === null);
}
await rejects('relay refuses a malformed Content-Range', () => relayChunk(SESSION, '0-9', chunk10), 400);
await rejects('relay refuses an oversized chunk', () => relayChunk(SESSION, 'bytes 0-9/20', Buffer.alloc(RELAY_CHUNK_BYTES + 1)), 413);
const part = await relayChunk(SESSION, 'bytes 0-9/20', chunk10);
check('a partial chunk reports where to resume', part.done === false && part.nextOffset === 10, JSON.stringify(part));
check('the chunk is PUT to the session with its range', relayed.method === 'PUT' && relayed.headers['Content-Range'] === 'bytes 0-9/20');
check('the chunk\'s bytes arrive intact', Buffer.from(relayed.body).toString() === '0123456789', Buffer.from(relayed.body).toString());
// A chunk that is a view into a larger buffer must send only its own bytes.
const pool = Buffer.from('xxxx0123456789yyyy');
await relayChunk(SESSION, 'bytes 0-9/20', pool.subarray(4, 14));
check('a sliced buffer sends only its slice', Buffer.from(relayed.body).toString() === '0123456789', Buffer.from(relayed.body).toString());
const last = await relayChunk(SESSION, 'bytes 10-19/20', chunk10);
check('the final chunk returns the Drive file id', last.done === true && last.fileId === 'relayed-file-01', JSON.stringify(last));

// --- revoke -------------------------------------------------------------------

await revokeIngestKey(supabase, 'event-a', stored.id);
await rejects('a revoked key is refused', () => resolveIngestCaller(req(`Bearer ${minted.key}`), supabase, 'event-a'), 401);
await rejects('revoking twice is 404', () => revokeIngestKey(supabase, 'event-a', stored.id), 404);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
