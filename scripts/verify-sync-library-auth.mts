/**
 * Harness for api/admin/sync-library.ts: only the admin, or the signed-in
 * owner of the gallery, may start a Drive sync. Everyone else is refused and
 * the sync never runs.
 * Run: npx tsx scripts/verify-sync-library-auth.mts
 */
import handler, { syncAuthDeps } from '../api/admin/sync-library.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
};

const ADMIN = 'Bearer admin-session';
const SESSIONS: Record<string, string> = { 'eric-session': 'user-eric', 'fan-session': 'user-fan' };
const GALLERIES: Record<string, string | null> = { 'erics-gallery': 'user-eric', 'house-gallery': null };
let synced: string[] = [];

syncAuthDeps.verifyAdmin = async (req: any) => req.headers.authorization === ADMIN;
syncAuthDeps.sessionUserId = async (t: string) => SESSIONS[t] ?? null;
syncAuthDeps.galleryOwner = async (slug: string) => ({ found: slug in GALLERIES, ownerId: GALLERIES[slug] ?? null });
syncAuthDeps.syncGalleryPhotos = async (slug: string) => { synced.push(slug); return { synced: 3, deleted: 0 } as any; };

async function call(slug: string, authorization?: string, method = 'POST') {
    let status = 0; let body: any = null;
    const res: any = { status(s: number) { status = s; return res; }, json(b: any) { body = b; return res; } };
    await handler({ method, headers: authorization ? { authorization } : {}, body: { slug } } as any, res);
    return { status, body };
}

synced = [];
let r = await call('house-gallery');
check('no login is refused (401)', r.status === 401 && synced.length === 0, String(r.status));
r = await call('house-gallery', 'Bearer not-a-real-session');
check('a bad token is refused (401)', r.status === 401 && synced.length === 0, String(r.status));
r = await call('house-gallery', 'Bearer fan-session');
check('a signed-in non-owner is refused (403)', r.status === 403 && synced.length === 0, String(r.status));
r = await call('erics-gallery', 'Bearer fan-session');
check('…even on someone else\'s photographer gallery', r.status === 403 && synced.length === 0, String(r.status));
r = await call('no-such-gallery', 'Bearer fan-session');
check('an unknown slug answers like "not yours" (no slug probing)', r.status === 403 && synced.length === 0, String(r.status));
r = await call('erics-gallery', 'Bearer eric-session');
check('the gallery\'s owner can sync it (onboarding wizard)', r.status === 200 && synced.join() === 'erics-gallery', `${r.status} ${synced}`);
synced = [];
r = await call('house-gallery', ADMIN);
check('the admin can sync any gallery', r.status === 200 && synced.join() === 'house-gallery', `${r.status} ${synced}`);
r = await call('', ADMIN);
check('a missing slug is 400', r.status === 400, String(r.status));
syncAuthDeps.syncGalleryPhotos = async () => { throw new Error('Drive is down'); };
r = await call('house-gallery', ADMIN);
check('a failure returns no stack trace', r.status === 500 && r.body && !('details' in r.body), JSON.stringify(r.body));

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
