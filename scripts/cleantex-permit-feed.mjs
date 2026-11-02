#!/usr/bin/env node
/**
 * CleanTex permit feed — turns City of Austin open permit data into a call list.
 *
 * Source: data.austintexas.gov dataset 3syk-w9eu ("Issued Construction Permits"),
 * which carries contractor_company_name / contractor_phone / contractor_trade
 * alongside the jobsite address. Anonymous access works; set SOCRATA_APP_TOKEN
 * to raise the rate limit.
 *
 * COVERAGE WARNING: this dataset is City of Austin jurisdiction only.
 * Kyle (78640) and Dripping Springs (78620) return ZERO rows — those cities run
 * their own portals and are not in here. Buda (78610) is partial (ETJ only).
 * See docs/cleantex/permit-feed.md.
 *
 *   node scripts/cleantex-permit-feed.mjs                    # ranked contractor call list
 *   node scripts/cleantex-permit-feed.mjs --mode jobsites    # addresses entering cleanup window
 *   node scripts/cleantex-permit-feed.mjs --days 365 --csv out/
 */

const DATASET = 'https://data.austintexas.gov/resource/3syk-w9eu.json';

// Drive-time rings from the Buda depot. Kyle/Dripping are absent from this
// dataset entirely, so they are listed in docs rather than here.
const TERRITORY = {
  core: {
    '78610': 'Buda (Austin ETJ portion)',
    '78652': 'Manchaca',
    '78748': 'South Austin / Southpark Meadows',
    '78745': 'South Austin',
    '78749': 'SW Austin / Shady Hollow',
    '78739': 'Circle C',
  },
  secondary: {
    '78737': 'Sunset Valley / Dripping edge',
    '78704': 'South Congress / South Lamar',
    '78735': 'SW Austin / Barton Creek',
    '78747': 'Southeast Austin',
    '78744': 'Southeast Austin',
  },
};

// Work classes that actually leave a mess worth cleaning. Demolition and
// non-structural interior demo are excluded: nothing to wash at the end.
const WORK_CLASSES = ['New', 'Addition', 'Addition and Remodel', 'Remodel', 'Shell'];

// Days-since-issue when a job typically reaches final clean. New construction
// runs long; remodels turn fast. Calling the day a permit is issued is months early.
const CLEANUP_WINDOW = {
  New: [150, 330],
  Shell: [150, 330],
  'Addition and Remodel': [60, 210],
  Addition: [60, 210],
  Remodel: [30, 150],
};

function parseArgs(argv) {
  const opts = { mode: 'contractors', days: 180, minValue: 0, csv: null, ring: 'all', limit: 40 };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inlineVal] = argv[i].split('=');
    const next = () => (inlineVal !== undefined ? inlineVal : argv[++i]);
    switch (flag) {
      case '--mode': opts.mode = next(); break;
      case '--days': opts.days = Number(next()); break;
      case '--min-value': opts.minValue = Number(next()); break;
      case '--csv': opts.csv = next(); break;
      case '--ring': opts.ring = next(); break;
      case '--limit': opts.limit = Number(next()); break;
      case '--help': case '-h': opts.help = true; break;
      default:
        if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return opts;
}

function zipsFor(ring) {
  const core = Object.keys(TERRITORY.core);
  const secondary = Object.keys(TERRITORY.secondary);
  if (ring === 'core') return core;
  if (ring === 'secondary') return secondary;
  return [...core, ...secondary];
}

function ringOf(zip) {
  if (TERRITORY.core[zip]) return 'core';
  if (TERRITORY.secondary[zip]) return 'secondary';
  return 'other';
}

function areaOf(zip) {
  return TERRITORY.core[zip] || TERRITORY.secondary[zip] || zip;
}

async function fetchPermits({ days, zips, minValue }) {
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 19);
  const quoted = (arr) => arr.map((v) => `'${v}'`).join(',');
  const where = [
    `permittype='BP'`,
    `issue_date > '${cutoff}'`,
    `original_zip IN (${quoted(zips)})`,
    `work_class IN (${quoted(WORK_CLASSES)})`,
  ].join(' AND ');

  const headers = {};
  if (process.env.SOCRATA_APP_TOKEN) headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;

  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(DATASET);
    url.searchParams.set('$where', where);
    url.searchParams.set('$order', 'issue_date DESC');
    url.searchParams.set('$limit', String(pageSize));
    url.searchParams.set('$offset', String(offset));

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows
    .map((r) => {
      const issued = new Date(r.issue_date);
      return {
        permit: r.permit_number,
        issued,
        ageDays: Math.floor((Date.now() - issued.getTime()) / 86400_000),
        address: r.permit_location || r.original_address1 || '',
        zip: r.original_zip || '',
        area: areaOf(r.original_zip),
        ring: ringOf(r.original_zip),
        workClass: r.work_class || '',
        permitClass: r.permit_class_mapped || '',
        value: Number(r.total_job_valuation || r.building_valuation || 0),
        company: cleanCompany(r.contractor_company_name),
        contact: cleanCompany(r.contractor_full_name),
        phone: normalizePhone(r.contractor_phone),
        trade: r.contractor_trade || '',
        link: r.link?.url || '',
      };
    })
    .filter((r) => r.value >= minValue);
}

/**
 * Austin's contractor_phone is free text: extensions get appended, country codes
 * get prefixed, and some rows hold only a fragment ("512"). Normalize to 10
 * digits where possible and flag the rest rather than printing a stub.
 */
function normalizePhone(raw) {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  if (d.length > 10) d = d.slice(0, 10); // trailing digits are almost always an extension
  return d.length === 10 ? d : '';
}

/** Strip the `**MAIN**` contact markers Austin's permit clerks embed in names. */
function cleanCompany(raw) {
  return (raw || '')
    .replace(/\*+/g, ' ')
    .replace(/\bMAIN\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,\s]+$/, '');
}

const fmtPhone = (d) =>
  d && d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : 'NO PHONE';
const fmtMoney = (n) => (n ? `$${Math.round(n).toLocaleString('en-US')}` : '—');
const fmtDate = (d) => d.toISOString().slice(0, 10);

/** Group permits by contractor into a ranked call list. */
function buildContractorList(permits, limit) {
  const byCompany = new Map();
  for (const p of permits) {
    const name = p.company || p.contact;
    if (!name) continue;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!byCompany.has(key)) {
      byCompany.set(key, {
        name, phone: p.phone, trade: p.trade, permits: 0, value: 0,
        coreJobs: 0, areas: new Set(), latest: p.issued, sample: p.address,
      });
    }
    const c = byCompany.get(key);
    c.permits += 1;
    c.value += p.value;
    if (p.ring === 'core') c.coreJobs += 1;
    c.areas.add(p.area);
    if (!c.phone && p.phone) c.phone = p.phone;
    if (p.issued > c.latest) { c.latest = p.issued; c.sample = p.address; }
  }

  return [...byCompany.values()]
    .sort((a, b) =>
      b.coreJobs - a.coreJobs || b.permits - a.permits || b.value - a.value)
    .slice(0, limit);
}

/** Permits whose age has entered the typical final-clean window. */
function buildJobsiteList(permits, limit) {
  return permits
    .filter((p) => {
      const win = CLEANUP_WINDOW[p.workClass];
      return win && p.ageDays >= win[0] && p.ageDays <= win[1];
    })
    .sort((a, b) => (a.ring === b.ring ? b.value - a.value : a.ring === 'core' ? -1 : 1))
    .slice(0, limit);
}

function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    columns.map((c) => c.header).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')),
  ].join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`CleanTex permit feed

  --mode contractors|jobsites   contractors = ranked call list (default)
                                jobsites    = addresses entering cleanup window
  --days N                      lookback window (default 180)
  --ring core|secondary|all     drive-time ring from Buda (default all)
  --min-value N                 minimum job valuation
  --limit N                     rows to print (default 40)
  --csv DIR                     also write CSV into DIR
`);
    return;
  }

  const zips = zipsFor(opts.ring);
  const permits = await fetchPermits({ days: opts.days, zips, minValue: opts.minValue });

  console.log(`\n# CLEANTEX PERMIT FEED`);
  console.log(`\nCity of Austin building permits · last ${opts.days} days · ring: ${opts.ring}`);
  console.log(`${permits.length} permits across ${zips.length} zips`);
  console.log(`NOTE: Kyle (78640) and Dripping Springs (78620) are not in this dataset.\n`);

  if (opts.mode === 'jobsites') {
    const jobs = buildJobsiteList(permits, opts.limit);
    console.log(`## Jobsites in cleanup window (${jobs.length})\n`);
    if (!jobs.length) console.log('_No permits currently in their cleanup window. Widen --days._');
    for (const j of jobs) {
      console.log(`- **${j.address}** — ${j.area} (${j.zip})`);
      console.log(`  ${j.workClass} · ${fmtMoney(j.value)} · issued ${fmtDate(j.issued)} (${j.ageDays}d ago)`);
      console.log(`  ${j.company || j.contact || 'contractor not listed'} · ${fmtPhone(j.phone)}`);
    }
    if (opts.csv) {
      const { writeFile, mkdir } = await import('node:fs/promises');
      await mkdir(opts.csv, { recursive: true });
      const path = `${opts.csv.replace(/\/$/, '')}/cleantex-jobsites.csv`;
      await writeFile(path, toCsv(jobs, [
        { header: 'address', value: (r) => r.address },
        { header: 'area', value: (r) => r.area },
        { header: 'zip', value: (r) => r.zip },
        { header: 'ring', value: (r) => r.ring },
        { header: 'work_class', value: (r) => r.workClass },
        { header: 'valuation', value: (r) => r.value },
        { header: 'issued', value: (r) => fmtDate(r.issued) },
        { header: 'age_days', value: (r) => r.ageDays },
        { header: 'contractor', value: (r) => r.company || r.contact },
        { header: 'phone', value: (r) => fmtPhone(r.phone) },
        { header: 'permit', value: (r) => r.permit },
        { header: 'link', value: (r) => r.link },
      ]));
      console.log(`\nWrote ${path}`);
    }
    return;
  }

  const contractors = buildContractorList(permits, opts.limit);
  console.log(`## Contractor call list (${contractors.length}, ranked by core-territory activity)\n`);
  for (const [i, c] of contractors.entries()) {
    console.log(`${i + 1}. **${c.name}** — ${fmtPhone(c.phone)}`);
    console.log(`   ${c.permits} permit${c.permits === 1 ? '' : 's'} (${c.coreJobs} in core) · ${fmtMoney(c.value)} · ${c.trade || 'trade n/a'}`);
    console.log(`   ${[...c.areas].join(', ')} · latest ${fmtDate(c.latest)}: ${c.sample}`);
  }

  if (opts.csv) {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(opts.csv, { recursive: true });
    const path = `${opts.csv.replace(/\/$/, '')}/cleantex-contractors.csv`;
    await writeFile(path, toCsv(contractors, [
      { header: 'company', value: (r) => r.name },
      { header: 'phone', value: (r) => fmtPhone(r.phone) },
      { header: 'trade', value: (r) => r.trade },
      { header: 'permits', value: (r) => r.permits },
      { header: 'core_permits', value: (r) => r.coreJobs },
      { header: 'total_valuation', value: (r) => Math.round(r.value) },
      { header: 'areas', value: (r) => [...r.areas].join('; ') },
      { header: 'latest_issue', value: (r) => fmtDate(r.latest) },
      { header: 'latest_address', value: (r) => r.sample },
      { header: 'called', value: () => '' },
      { header: 'outcome', value: () => '' },
      { header: 'callback_date', value: () => '' },
    ]));
    console.log(`\nWrote ${path}`);
  }
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
