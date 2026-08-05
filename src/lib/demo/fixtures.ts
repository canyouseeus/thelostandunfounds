/**
 * DEMO MODE — seeded fixtures.
 *
 * Demo mode is not a second website. It is the same components reading a
 * fixture set instead of Supabase, with every write intercepted. That is the
 * whole reason it exists: when the real dashboard improves, the demo improves
 * with it, because there is only one dashboard.
 *
 * Everything here is generated from a fixed seed, so the numbers are identical
 * on every load and on every machine. A demo that reshuffles itself between two
 * people looking at it is not a shared view of anything — the whole point is
 * that Jack and I can point at the same figure and be pointing at the same
 * figure.
 *
 * No real client names, no real revenue, no real email addresses.
 */

/** mulberry32 — small, fast, deterministic. Same seed, same sequence, forever. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A series that drifts rather than jitters — a random walk with a gentle trend,
 * clamped to stay positive. Pure noise reads as "fake data" instantly; a trend
 * with texture reads as a business.
 */
function series(seed: number, points: number, start: number, trend: number, jitter: number) {
  const r = rng(seed);
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < points; i++) {
    v = Math.max(1, v + trend + (r() - 0.5) * jitter);
    out.push(Math.round(v));
  }
  return out;
}

export type DemoClient = {
  id: string;
  name: string;
  contact: string;
  email: string;
  stage: 'inquiry' | 'proposal' | 'active' | 'retained' | 'dormant';
  region: string;
  since: string;
  monthlyValue: number;
  openRequests: number;
  /** 12 weeks of billed value — feeds the profile sparkline. */
  billing: number[];
};

export const DEMO_CLIENTS: DemoClient[] = [
  {
    id: 'dc_northgate',
    name: 'Northgate Restoration',
    contact: 'Dana Ruiz',
    email: 'dana@northgate.example',
    stage: 'retained',
    region: 'Metro North',
    since: '2025-02-11',
    monthlyValue: 4800,
    openRequests: 2,
    billing: series(101, 12, 3900, 70, 900),
  },
  {
    id: 'dc_halcyon',
    name: 'Halcyon Interiors',
    contact: 'Priya Nair',
    email: 'priya@halcyon.example',
    stage: 'active',
    region: 'Downtown',
    since: '2025-06-03',
    monthlyValue: 2600,
    openRequests: 1,
    billing: series(202, 12, 2100, 45, 700),
  },
  {
    id: 'dc_ferrous',
    name: 'Ferrous Fabrication',
    contact: 'Sam Okoye',
    email: 'sam@ferrous.example',
    stage: 'active',
    region: 'Industrial East',
    since: '2025-09-19',
    monthlyValue: 3300,
    openRequests: 4,
    billing: series(303, 12, 2400, 85, 1100),
  },
  {
    id: 'dc_solace',
    name: 'Solace Dental Group',
    contact: 'Adaeze Bello',
    email: 'ab@solacedental.example',
    stage: 'proposal',
    region: 'Metro North',
    since: '2026-05-28',
    monthlyValue: 0,
    openRequests: 3,
    billing: series(404, 12, 400, -12, 300),
  },
  {
    id: 'dc_pinewood',
    name: 'Pinewood Landscaping',
    contact: 'Marco Vieira',
    email: 'marco@pinewood.example',
    stage: 'inquiry',
    region: 'South Ridge',
    since: '2026-07-22',
    monthlyValue: 0,
    openRequests: 1,
    billing: series(505, 12, 200, 4, 220),
  },
  {
    id: 'dc_verity',
    name: 'Verity Legal',
    contact: 'Hannah Colestock',
    email: 'h.colestock@verity.example',
    stage: 'dormant',
    region: 'Downtown',
    since: '2024-11-04',
    monthlyValue: 0,
    openRequests: 0,
    billing: series(606, 12, 1800, -130, 600),
  },
];

/**
 * The four readables, in the order they answer the question "is this business
 * healthy": is work coming in, can he take it, where is he going, does he get
 * paid. Each carries the accent its category owns per the GRAPH STYLE RULE —
 * categories differ by accent only, never by chart dialect.
 */
export type DemoMetric = {
  key: string;
  label: string;
  value: string;
  delta: number;
  /** Which CHART_ACCENTS entry this reads in. */
  accent: 'revenue' | 'newsletter' | 'affiliates' | 'bookings' | 'analytics' | 'crm';
  series: number[];
  /** Plain-English provenance — what feeds this number. */
  source: string;
};

export const DEMO_METRICS: DemoMetric[] = [
  {
    key: 'inquiries',
    label: 'Inquiries',
    value: '31',
    delta: 18,
    accent: 'newsletter',
    series: series(11, 30, 14, 0.55, 6),
    source: 'client_events where type = inquiry, last 30 days, grouped by day',
  },
  {
    key: 'conversion',
    label: 'Inquiry → Booked',
    value: '42%',
    delta: -6,
    accent: 'affiliates',
    series: series(22, 30, 52, -0.35, 7),
    source: 'booked events ÷ inquiry events, 14-day trailing window',
  },
  {
    key: 'utilization',
    label: 'Crew Utilization',
    value: '88%',
    delta: 11,
    accent: 'bookings',
    series: series(33, 30, 61, 0.9, 8),
    source: 'booked crew-hours ÷ available crew-hours, rolling 30 days',
  },
  {
    key: 'revenue',
    label: 'Billed',
    value: '$41.2K',
    delta: 9,
    accent: 'revenue',
    series: series(44, 30, 980, 22, 260),
    source: 'invoices where status = paid, sum of totals by day',
  },
  {
    key: 'ar_days',
    label: 'Days To Payment',
    value: '27',
    delta: 21,
    accent: 'crm',
    series: series(55, 30, 18, 0.3, 5),
    source: 'mean(paid_at − issued_at) over invoices closed in window',
  },
  {
    key: 'radius',
    label: 'Avg Job Radius',
    value: '34 mi',
    delta: 14,
    accent: 'analytics',
    series: series(66, 30, 22, 0.4, 6),
    source: 'mean travel distance from base to job site, booked jobs',
  },
];

export type DemoMessage = {
  id: string;
  author: 'you' | 'jack';
  body: string;
  /** What the message is pinned to, if anything — a chart, a client, a request. */
  contextRef: string | null;
  at: string;
};

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: 'dm_1',
    author: 'jack',
    body: 'Utilization crossed 85% two weeks running. I am turning work away.',
    contextRef: 'chart:utilization',
    at: '2026-08-03T14:12:00Z',
  },
  {
    id: 'dm_2',
    author: 'you',
    body: 'Then the build is subcontractor onboarding, not more lead gen. Filing it.',
    contextRef: 'chart:utilization',
    at: '2026-08-03T14:31:00Z',
  },
  {
    id: 'dm_3',
    author: 'jack',
    body: 'Where did the Days To Payment trace come from? I want that one on my side.',
    contextRef: 'chart:ar_days',
    at: '2026-08-04T09:02:00Z',
  },
  {
    id: 'dm_4',
    author: 'you',
    body: 'Invoices table, mean of paid_at minus issued_at. Hit "use this" on the card.',
    contextRef: 'chart:ar_days',
    at: '2026-08-04T09:15:00Z',
  },
  {
    id: 'dm_5',
    author: 'jack',
    body: 'Solace wants a proposal by Friday. Assets are in the shared folder.',
    contextRef: 'client:dc_solace',
    at: '2026-08-04T16:40:00Z',
  },
];

export type DemoRequest = {
  id: string;
  title: string;
  from: 'you' | 'jack';
  status: 'open' | 'building' | 'shipped';
  contextRef: string | null;
};

export const DEMO_REQUESTS: DemoRequest[] = [
  { id: 'dr_1', title: 'Days To Payment card on Jack\'s dashboard', from: 'jack', status: 'building', contextRef: 'chart:ar_days' },
  { id: 'dr_2', title: 'Subcontractor onboarding workflow', from: 'you', status: 'open', contextRef: 'chart:utilization' },
  { id: 'dr_3', title: 'Job sites plotted by region', from: 'jack', status: 'open', contextRef: 'chart:radius' },
  { id: 'dr_4', title: 'Proposal generator wired to client assets', from: 'you', status: 'shipped', contextRef: 'client:dc_solace' },
];

/** Where a demo signup lands: nowhere. Listed so the walkthrough can say so. */
export const DEMO_SIGNUP_FIELDS = [
  { name: 'business', label: 'Business Name', type: 'text', placeholder: 'Northgate Restoration', required: true },
  { name: 'contact', label: 'Primary Contact', type: 'text', placeholder: 'Dana Ruiz', required: true },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'dana@northgate.example', required: true },
  { name: 'region', label: 'Service Region', type: 'text', placeholder: 'Metro North', required: false },
  { name: 'crew', label: 'Crew Size', type: 'number', placeholder: '6', required: false },
  { name: 'notes', label: 'What Are You Trying To Fix', type: 'textarea', placeholder: 'Turning work away — need to staff up without dropping quality.', required: false },
] as const;
