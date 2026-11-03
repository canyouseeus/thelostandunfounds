/**
 * Harness for à la carte galleries (owner, 2026-11-02): one album, two invite
 * lists. Album owners get every photo free; buyers see the album and get the
 * full file only for photos they bought. Everyone else gets no full file from
 * a private album.
 * Run: npx tsx scripts/verify-a-la-carte.mts
 */
process.env.GALLERY_INVITE_SECRET = 'test-secret';
import { roleFor, mintPass, verifyPass, isFreeLibrary } from '../lib/api-handlers/_gallery-pass.ts';
import { streamAccess } from '../lib/api-handlers/_stream-access.ts';
import { buyerTotal, cleanBundles, galleryTotal } from '../src/lib/buyerPricing.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
};

// --- roles --------------------------------------------------------------------
const lib = { invited_emails: 'media@thelostandunfounds.com, Bandit@icloud.com', buyer_emails: 'vazquezboii21@gmail.com', owner_id: 'u-owner', user_id: 'u-owner' };
check('an album owner is "owner" (case/space ignored)', roleFor(lib, { email: 'bandit@icloud.com' }) === 'owner');
check('an à la carte address is "buyer"', roleFor(lib, { email: 'VazquezBoii21@gmail.com' }) === 'buyer');
check('a stranger has no role', roleFor(lib, { email: 'stranger@x.com' }) === null);
check('the admin is "owner"', roleFor(lib, { email: 'stranger@x.com', isAdmin: true }) === 'owner');
check('the gallery\'s own account is "owner"', roleFor(lib, { email: 'x@x.com', userId: 'u-owner' }) === 'owner');
check('on both lists → owner wins (never charged)', roleFor({ ...lib, buyer_emails: 'bandit@icloud.com' }, { email: 'bandit@icloud.com' }) === 'owner');

// --- passes -------------------------------------------------------------------
const now = 1_800_000_000_000;
const buyerPass = mintPass('lib-a', 'vazquezboii21@gmail.com', 'buyer', now);
const ownerPass = mintPass('lib-a', 'bandit@icloud.com', 'owner', now);
check('a pass verifies for its gallery', verifyPass(buyerPass, 'lib-a', now)?.role === 'buyer' && verifyPass(buyerPass, 'lib-a', now)?.email === 'vazquezboii21@gmail.com');
check('…not for another gallery', verifyPass(buyerPass, 'lib-b', now) === null);
check('…not after it expires (12h)', verifyPass(buyerPass, 'lib-a', now + 13 * 3600_000) === null);
const [e, , exp, sig] = buyerPass.split('.');
check('a buyer can\'t promote their pass to owner', verifyPass(`${e}.owner.${exp}.${sig}`, 'lib-a', now) === null);
check('a tampered signature is refused', verifyPass(`${e}.buyer.${exp}.${sig.slice(0, -2)}xx`, 'lib-a', now) === null);
check('junk is refused', verifyPass('junk', 'lib-a', now) === null && verifyPass(undefined, 'lib-a', now) === null);

// --- free vs priced -----------------------------------------------------------
check('Mikey & Bandit as set up ($5 legacy price, Single Photo $0) is free for its owners', isFreeLibrary({ price: 5 }, [{ price: 0, photo_count: 1 }]));
check('LAST NIGHT (Single $20) is not free', !isFreeLibrary({ price: 5 }, [{ price: 20, photo_count: 1 }]));
check('a $0 gallery with a paid bundle is not free', !isFreeLibrary({ price: 0 }, [{ price: 30, photo_count: 10 }]));

// --- stream access --------------------------------------------------------------
const db: Record<string, any[]> = {
    photo_libraries: [
        { id: 'lib-a', is_private: true },
        { id: 'lib-pub', is_private: false },
    ],
    photo_entitlements: [
        { id: 'ent-1', photo_id: 'p-bought', token: 'tok-good-123', expires_at: null, photo_orders: { email: 'VazquezBoii21@gmail.com' } },
        { id: 'ent-2', photo_id: 'p-other', token: 'tok-other-123', expires_at: null, photo_orders: { email: 'someone@else.com' } },
        { id: 'ent-3', photo_id: 'p-bought', token: 'tok-expired-1', expires_at: new Date(now - 1000).toISOString(), photo_orders: { email: 'x@y.com' } },
    ],
};
const supabase: any = {
    from(table: string) {
        const f: [string, any][] = [];
        const rows = () => (db[table] || []).filter(r => f.every(([c, v]) => r[c] === v));
        const q: any = {
            select: () => q,
            eq: (c: string, v: any) => { f.push([c, v]); return q; },
            maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
            limit: async () => ({ data: rows(), error: null }),
        };
        return q;
    },
};
const A = (photoId: string, extra: any = {}) => streamAccess(supabase, { photoId, libraryId: 'lib-a', ...extra }, now);

let r = await A('p-bought');
check('private album, no proof → no full file, kept out of the shared cache', !r.download && r.personal);
r = await A('p-unbought', { gp: ownerPass });
check('album owner → full file', r.download && r.personal);
r = await A('p-unbought', { gp: buyerPass });
check('buyer, photo not bought → no full file', !r.download);
r = await A('p-bought', { gp: buyerPass });
check('buyer, photo bought (order under their email) → full file', r.download);
r = await A('p-other', { gp: buyerPass });
check('buyer can\'t ride someone else\'s purchase', !r.download);
r = await A('p-bought', { gp: mintPass('lib-a', 'stranger@x.com', 'buyer', now) });
check('a buyer pass for someone who didn\'t buy → no full file', !r.download);
r = await A('p-bought', { et: 'tok-good-123' });
check('a paid order\'s token (download portal) → full file', r.download && r.personal);
r = await A('p-unbought', { et: 'tok-good-123' });
check('…only for the photo it was issued for', !r.download);
r = await A('p-bought', { et: 'tok-expired-1' });
check('…and not once it has expired', !r.download);
r = await A('p-bought', { gp: mintPass('lib-other', 'bandit@icloud.com', 'owner', now) });
check('an owner pass from another gallery doesn\'t work here', !r.download);
r = await streamAccess(supabase, { photoId: 'p-pub', libraryId: 'lib-pub' }, now);
check('public gallery: unchanged (separate change), shared cache OK', r.download && !r.personal);

// --- à la carte prices (Mikey & Bandit: $5, 4 for $10, whole album of 69 for $75) ---
const P = { single: 5, bundles: cleanBundles([{ photo_count: 4, price: 10 }]), albumPrice: 75, albumCount: 69 };
const cases: [number, number][] = [[1, 5], [3, 15], [4, 10], [5, 15], [8, 20], [9, 25], [69, 75], [70, 75]];
for (const [n, want] of cases) check(`${n} photo${n === 1 ? '' : 's'} costs $${want}`, buyerTotal(n, P) === want, `got $${buyerTotal(n, P)}`);
check('no album price set → no album deal (69 photos = 17×$10 + $5)', buyerTotal(69, { ...P, albumPrice: null }) === 175, String(buyerTotal(69, { ...P, albumPrice: null })));
check('junk bundles are dropped (1-photo or $0 "bundles" can\'t undercut)', cleanBundles([{ photo_count: 1, price: 0 }, { photo_count: 4, price: 0 }, { photo_count: 'x', price: 3 }, { photo_count: 4, price: 10 }]).length === 1);
check('nothing selected costs nothing', buyerTotal(0, P) === 0);

// --- whole album for every buyer (HOLLOW33N: $5, 3 for $10, 146 photos, album $75) ---
const hollow = { single: 5, options: [{ photo_count: 3, price: '10.00' }], albumPrice: 75, albumCount: 146 };
check('1 photo costs $5', galleryTotal(1, hollow) === 5, String(galleryTotal(1, hollow)));
check('3 photos cost $10 (bundle)', galleryTotal(3, hollow) === 10, String(galleryTotal(3, hollow)));
check('7 photos = 2×$10 + $5', galleryTotal(7, hollow) === 25, String(galleryTotal(7, hollow)));
check('145 photos are not the whole album (48×$10 + $5)', galleryTotal(145, hollow) === 485, String(galleryTotal(145, hollow)));
check('all 146 photos cost the album price, $75', galleryTotal(146, hollow) === 75, String(galleryTotal(146, hollow)));
check('no album price → no album deal (146 = 48×$10 + 2×$5)', galleryTotal(146, { ...hollow, albumPrice: null }) === 490, String(galleryTotal(146, { ...hollow, albumPrice: null })));
check('album count unknown (0) → no album deal', galleryTotal(146, { ...hollow, albumCount: 0 }) === 490);
const lastNight = { single: 5, options: [{ photo_count: 1, price: 20 }, { photo_count: 3, price: 50 }], albumPrice: null, albumCount: 40 };
check('a 1-photo option is the per-photo price (LAST NIGHT: 4 = $50 + $20)', galleryTotal(4, lastNight) === 70, String(galleryTotal(4, lastNight)));
check('junk options (count 0 / -1) are ignored', galleryTotal(2, { ...hollow, options: [{ photo_count: -1, price: 999 }, { photo_count: 0, price: 1 }] }) === 10);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
