/**
 * Exercises attachReferralToClient against an in-memory stand-in for Supabase.
 * Every assertion must be able to fail — the last case deliberately proves the
 * "never overwrite" guard by trying to steal a customer.
 */
import { attachReferralToClient, normalizeAffiliateCode, affiliateCodeFromRequest } from '../lib/api-handlers/affiliates/_referral-attach.js'

type Row = Record<string, any>

function makeDb(seed: { affiliates: Row[]; clients: Row[]; ties: Row[] }) {
  const tables: Record<string, Row[]> = {
    affiliates: seed.affiliates,
    clients: seed.clients,
    affiliate_customers: seed.ties,
  }

  function builder(table: string) {
    let rows = [...tables[table]]
    let mode: 'select' | 'update' | 'insert' = 'select'
    let patch: Row = {}
    const api: any = {
      select() { return api },
      insert(v: Row) { mode = 'insert'; tables[table].push({ id: `gen-${tables[table].length + 1}`, ...v }); return Promise.resolve({ data: null, error: null }) },
      update(v: Row) { mode = 'update'; patch = v; return api },
      eq(col: string, val: any) { rows = rows.filter(r => r[col] === val); return api },
      is(col: string, val: any) { rows = rows.filter(r => (r[col] ?? null) === val); return api },
      ilike(col: string, val: string) { rows = rows.filter(r => String(r[col] ?? '').toLowerCase() === String(val).toLowerCase()); return api },
      or(expr: string) {
        const wanted = expr.split(',').map(p => p.split('.eq.')[1])
        rows = rows.filter(r => wanted.includes(r.code) || wanted.includes(r.affiliate_code))
        return api
      },
      limit(n: number) { rows = rows.slice(0, n); return api },
      maybeSingle() { return Promise.resolve({ data: rows[0] ?? null, error: null }) },
      then(res: any) {
        if (mode === 'update') {
          for (const r of rows) Object.assign(r, patch)
          return Promise.resolve({ data: rows, error: null }).then(res)
        }
        return Promise.resolve({ data: rows, error: null }).then(res)
      },
    }
    return api
  }

  return { from: (t: string) => builder(t), _tables: tables } as any
}

let failures = 0
function check(label: string, cond: boolean, detail?: any) {
  if (cond) console.log(`  PASS  ${label}`)
  else { failures++; console.log(`  FAIL  ${label}`, detail ?? '') }
}

const AFF_A = { id: 'aff-a', code: 'ALPHA', affiliate_code: null, status: 'active', is_flagged: false }
const AFF_B = { id: 'aff-b', code: 'BRAVO', affiliate_code: null, status: 'active', is_flagged: false }
const AFF_FLAGGED = { id: 'aff-f', code: 'FRAUD', affiliate_code: null, status: 'active', is_flagged: true }
const AFF_INACTIVE = { id: 'aff-i', code: 'IDLE', affiliate_code: null, status: 'suspended', is_flagged: false }

async function main() {
  console.log('normalize / extract')
  check('lowercases + trims to canonical code', normalizeAffiliateCode('  alpha ') === 'ALPHA')
  check('rejects junk', normalizeAffiliateCode('a;drop table') === null)
  check('reads X-Affiliate-Ref header', affiliateCodeFromRequest({ headers: { 'x-affiliate-ref': 'bravo' } }) === 'BRAVO')
  check('body affiliate_code wins over header', affiliateCodeFromRequest({ body: { affiliate_code: 'alpha' }, headers: { 'x-affiliate-ref': 'bravo' } }) === 'ALPHA')

  console.log('fresh referral from a link')
  {
    const db = makeDb({ affiliates: [AFF_A], clients: [{ id: 'c1', email: 'new@x.com' }], ties: [] })
    const r = await attachReferralToClient(db, { clientId: 'c1', email: 'NEW@x.com', affiliateCode: 'alpha', source: 'booking_request' })
    check('attached', r.attached === true, r)
    check('client stamped with ALPHA', db._tables.clients[0].referred_by_code === 'ALPHA', db._tables.clients[0])
    check('lifetime tie created', db._tables.affiliate_customers.length === 1, db._tables.affiliate_customers)
  }

  console.log('no link on the request, but a lifetime tie exists (the fallback)')
  {
    const db = makeDb({
      affiliates: [AFF_A],
      clients: [{ id: 'c1', email: 'known@x.com' }],
      ties: [{ id: 't1', email: 'known@x.com', referred_by_affiliate_id: 'aff-a' }],
    })
    const r = await attachReferralToClient(db, { clientId: 'c1', email: 'known@x.com', affiliateCode: null, source: 'booking_request' })
    check('attached from existing tie', r.attached === true, r)
    check('source records the fallback', db._tables.clients[0].referral_source === 'booking_request_from_lifetime_tie', db._tables.clients[0])
  }

  console.log('first touch is permanent')
  {
    const db = makeDb({
      affiliates: [AFF_A, AFF_B],
      clients: [{ id: 'c1', email: 'loyal@x.com', referred_by_affiliate_id: 'aff-a', referred_by_code: 'ALPHA' }],
      ties: [{ id: 't1', email: 'loyal@x.com', referred_by_affiliate_id: 'aff-a' }],
    })
    const r = await attachReferralToClient(db, { clientId: 'c1', email: 'loyal@x.com', affiliateCode: 'BRAVO', source: 'booking_request' })
    check('second affiliate cannot take the customer', db._tables.clients[0].referred_by_code === 'ALPHA', db._tables.clients[0])
    check('reported as already attributed', r.alreadyAttributed === true, r)
  }

  console.log('codes that must not attach')
  {
    const db = makeDb({ affiliates: [AFF_FLAGGED, AFF_INACTIVE], clients: [{ id: 'c1', email: 'a@x.com' }], ties: [] })
    const flagged = await attachReferralToClient(db, { clientId: 'c1', email: 'a@x.com', affiliateCode: 'FRAUD', source: 'booking_request' })
    check('flagged affiliate rejected', flagged.attached === false, flagged)
    const inactive = await attachReferralToClient(db, { clientId: 'c1', email: 'a@x.com', affiliateCode: 'IDLE', source: 'booking_request' })
    check('inactive affiliate rejected', inactive.attached === false, inactive)
    const unknown = await attachReferralToClient(db, { clientId: 'c1', email: 'a@x.com', affiliateCode: 'NOPE', source: 'booking_request' })
    check('unknown code is simply no referral', unknown.attached === false && unknown.reason === 'no_referral', unknown)
    check('client left untouched', db._tables.clients[0].referred_by_code === undefined, db._tables.clients[0])
  }

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
