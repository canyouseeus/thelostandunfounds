/**
 * Harness for the photographer share of a photo sale
 * (lib/api-handlers/crew/_shared.ts: photoSaleSplit, accruePhotoSalePayouts).
 *
 * The rule (owner, 2026-10-26): a sale from a crew photographer's own gallery
 * pays them 97%, less their part of Stripe's fee; the house keeps 3%, and
 * affiliates are paid out of that 3% — which works because the photographer's
 * share is reported back as the sale's cost.
 *
 * What must never happen, and is checked here: the house's own galleries
 * paying out (the owner's login also has a photographers row), an inactive
 * photographer being paid, a replayed webhook paying twice, or a payout that
 * exceeds what the sale brought in.
 *
 * Drives the real functions against an in-memory PostgREST stub.
 * Run: npx tsx scripts/verify-photo-sale-split.mts
 */
import { accruePhotoSalePayouts, photoSaleSplit, PHOTO_SALE_PLATFORM_RATE } from '../lib/api-handlers/crew/_shared.js';

type Row = Record<string, any>;
const OWNER = 'user-owner';
const ERIC = 'user-eric';
const GONE = 'user-gone';
const users: Record<string, string> = { [OWNER]: 'thelostandunfounds@gmail.com', [ERIC]: 'four5culture@gmail.com', [GONE]: 'gone@example.com' };

let db: Record<string, Row[]> = {};
function reset() {
    db = {
        photographers: [
            { id: 'ph-house', name: 'THE LOST+UNFOUNDS', email: 'x', user_id: OWNER, stripe_account_id: 'acct_house', payout_pct: 0, active: true },
            { id: 'ph-eric', name: 'Eric Alvarado', email: 'e', user_id: ERIC, stripe_account_id: 'acct_eric', payout_pct: 80, active: true },
            { id: 'ph-gone', name: 'Former', email: 'g', user_id: GONE, stripe_account_id: 'acct_gone', payout_pct: 80, active: false },
        ],
        photo_libraries: [
            { id: 'lib-eric', name: 'Halloween at Primos', owner_id: ERIC },
            { id: 'lib-house', name: 'LAST NIGHT', owner_id: OWNER },
            { id: 'lib-gone', name: 'Old Gig', owner_id: GONE },
            { id: 'lib-none', name: 'No Owner', owner_id: null },
        ],
        photos: [
            ...[1, 2, 3, 4].map(n => ({ id: `e${n}`, library_id: 'lib-eric' })),
            ...[1, 2].map(n => ({ id: `h${n}`, library_id: 'lib-house' })),
            { id: 'g1', library_id: 'lib-gone' },
            { id: 'n1', library_id: 'lib-none' },
        ],
        affiliates: [],
        crew_payouts: [],
    };
}

function makeSupabase() {
    return {
        auth: { admin: { getUserById: async (id: string) => ({ data: { user: users[id] ? { id, email: users[id] } : null }, error: null }) } },
        from(table: string) {
            const q: any = {
                op: 'select', payload: null, filters: [] as Array<(r: Row) => boolean>, _single: false,
                select() { return q; },
                eq(c: string, v: any) { q.filters.push((r: Row) => r[c] === v); return q; },
                in(c: string, v: any[]) { q.filters.push((r: Row) => v.includes(r[c])); return q; },
                insert(p: any) { q.op = 'insert'; q.payload = p; return q; },
                update(p: any) { q.op = 'update'; q.payload = p; return q; },
                single() { q._single = true; return q; },
                maybeSingle() { q._single = true; return q; },
                then(res: any, rej: any) { return Promise.resolve(run()).then(res, rej); },
            };
            const rows = () => (db[table] ??= []);
            const match = (r: Row) => q.filters.every((f: any) => f(r));
            function run() {
                if (q.op === 'select') {
                    const hit = rows().filter(match);
                    return { data: q._single ? hit[0] ?? null : hit, error: null };
                }
                if (q.op === 'insert') {
                    const p = q.payload;
                    if (table === 'crew_payouts') {
                        if (!(p.amount > 0)) return { data: null, error: { code: '23514', message: 'amount must be > 0' } };
                        if (rows().some(r => r.photo_order_id === p.photo_order_id && r.photographer_id === p.photographer_id)) {
                            return { data: null, error: { code: '23505', message: 'duplicate' } };
                        }
                    }
                    rows().push({ id: `${table}-${rows().length + 1}`, ...p });
                    return { data: null, error: null };
                }
                if (q.op === 'update') {
                    for (const r of rows().filter(match)) Object.assign(r, q.payload);
                    return { data: null, error: null };
                }
                throw new Error(`stub: ${q.op}`);
            }
            return q;
        },
    } as any;
}

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
}
const cents = (n: number) => Math.round(n * 100);

// --- the split itself ----------------------------------------------------------

check('platform rate is 3%', PHOTO_SALE_PLATFORM_RATE === 0.03);
const whole = photoSaleSplit({ gross: 100, photographerPhotos: 4, totalPhotos: 4, stripeFee: 3.2 });
check('$100 all theirs, $3.20 fee → share $97, payout $93.80', whole.share === 97 && whole.payout === 93.8, JSON.stringify(whole));
const third = photoSaleSplit({ gross: 10, photographerPhotos: 1, totalPhotos: 3, stripeFee: 0.59 });
check('a third of a $10 sale rounds to the cent', third.portion === 3.33 && third.share === 3.23 && third.payout === 3.03, JSON.stringify(third));
const eaten = photoSaleSplit({ gross: 1, photographerPhotos: 1, totalPhotos: 1, stripeFee: 2 });
check('a fee bigger than the share pays nothing, never negative', eaten.payout === 0 && eaten.share === 0.97, JSON.stringify(eaten));
for (const [gross, fee] of [[5, 0.45], [12.34, 0.66], [250, 7.55], [0.5, 0.31]]) {
    const s = photoSaleSplit({ gross, photographerPhotos: 1, totalPhotos: 1, stripeFee: fee });
    check(`$${gross}: payout + fee never exceeds 97% of the sale`, cents(s.payout) + cents(fee) <= cents(gross * 0.97) + 1, JSON.stringify(s));
}

// --- accrual --------------------------------------------------------------------

const PAID = '2026-10-26T03:00:00.000Z';
reset();
let r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o1', photoIds: ['e1', 'e2', 'e3', 'e4'], grossAmount: 100, stripeFee: 3.2, paidAt: PAID });
let rows = db.crew_payouts;
check('Eric\'s own gallery: one payout of $93.80 to him', rows.length === 1 && rows[0].photographer_id === 'ph-eric' && rows[0].amount === 93.8, JSON.stringify(rows.map(x => [x.photographer_id, x.amount])));
check('…reported cost $97 (affiliates split the $3)', r.cost === 97, String(r.cost));
check('…to his Stripe account, pending, tied to the order', rows[0].stripe_account_id === 'acct_eric' && rows[0].status === 'pending' && rows[0].photo_order_id === 'o1' && rows[0].user_id === ERIC);
check('…described with the gallery and count', rows[0].description === 'Photo sale — Halloween at Primos (4 photos)', rows[0].description);
check('…held 2 days after payment by default', rows[0].available_at === '2026-10-28T03:00:00.000Z', rows[0].available_at);

r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o1', photoIds: ['e1', 'e2', 'e3', 'e4'], grossAmount: 100, stripeFee: 3.2, paidAt: PAID });
check('a replayed webhook pays nothing twice', db.crew_payouts.length === 1 && r.accrued.length === 0, `${db.crew_payouts.length} rows`);
check('…but reports the same cost, so the commission matches', r.cost === 97);

reset();
r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o2', photoIds: ['e1', 'e2', 'h1', 'h2'], grossAmount: 100, stripeFee: 3.2, paidAt: PAID });
rows = db.crew_payouts;
check('mixed order: Eric paid for his half only ($46.90)', rows.length === 1 && rows[0].photographer_id === 'ph-eric' && rows[0].amount === 46.9, JSON.stringify(rows.map(x => x.amount)));
check('…cost is his share only ($48.50); the house half stays profit', r.cost === 48.5, String(r.cost));

reset();
r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o3', photoIds: ['h1', 'h2'], grossAmount: 40, stripeFee: 1.46, paidAt: PAID });
check('the house\'s own gallery pays nobody (owner login is an admin)', db.crew_payouts.length === 0 && r.cost === 0, JSON.stringify(r));

reset();
r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o4', photoIds: ['g1', 'n1'], grossAmount: 20, stripeFee: 0.88, paidAt: PAID });
check('an inactive photographer and an ownerless gallery pay nobody', db.crew_payouts.length === 0 && r.cost === 0, JSON.stringify(r));

reset();
r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o5', photoIds: ['e1'], grossAmount: 1, stripeFee: 2, paidAt: PAID });
check('fee eats a tiny sale: no row written, cost still their share', db.crew_payouts.length === 0 && r.cost === 0.97, JSON.stringify(r));

reset();
await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o6', photoIds: ['e1'], grossAmount: 10, stripeFee: 0.59, paidAt: PAID, availableOn: '2026-10-30T00:00:00.000Z' });
check('waits for Stripe when Stripe frees the money later than the hold', db.crew_payouts[0]?.available_at === '2026-10-30T00:00:00.000Z', db.crew_payouts[0]?.available_at);

reset();
r = await accruePhotoSalePayouts(makeSupabase(), { photoOrderId: 'o7', photoIds: [], grossAmount: 10, stripeFee: 0.59 });
check('an order with no photos does nothing', db.crew_payouts.length === 0 && r.cost === 0);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
