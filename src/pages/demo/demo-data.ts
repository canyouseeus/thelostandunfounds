/* ============================================================
   DEMO SANDBOX — fabricated data only.

   Joshua: "I don't want any real data on that at all... If they were to visit
   that page, like the link, twice or something, I wouldn't want them to see
   the same things."

   So: nothing in this file reads Supabase, Stripe, Zoho or the session. Every
   figure, name and address below is generated with Math.random() at mount, so
   two visits to the same demo URL never show the same console. Names are
   invented, and every email lands on a reserved-for-documentation domain
   (RFC 2606 example.com / example.net) so a demo address can never collide
   with a real person's inbox.

   RULE FOR ANYONE EDITING THIS: never import a live client here. If a demo
   panel needs a number, it gets one from this file.
   ============================================================ */

/* ---------------------------------- dice ---------------------------------- */

export const rint = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const rfloat = (min: number, max: number, dp = 2) =>
  Number((Math.random() * (max - min) + min).toFixed(dp));

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** N distinct picks, or as many as the pool allows. */
export function sample<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(...pool.splice(rint(0, pool.length - 1), 1));
  return out;
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const money2 = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* --------------------------------- people --------------------------------- */

const FIRST = [
  'Marisol', 'Devon', 'Priya', 'Terrence', 'Ingrid', 'Kofi', 'Selene', 'Ruben',
  'Anika', 'Bo', 'Camille', 'Dmitri', 'Elena', 'Franklin', 'Gita', 'Hollis',
  'Imani', 'Jonas', 'Keiko', 'Lucian', 'Mabel', 'Nadia', 'Otis', 'Paloma',
  'Quentin', 'Rosalind', 'Silas', 'Tamsin', 'Ulises', 'Vera', 'Wendell', 'Ximena',
] as const;

const LAST = [
  'Abara', 'Beaumont', 'Castellanos', 'Delacroix', 'Ellsworth', 'Fontaine',
  'Gallardo', 'Halloran', 'Iversen', 'Juarez', 'Kowalski', 'Lindqvist',
  'Marchetti', 'Nakamura', 'Okonkwo', 'Pemberton', 'Quintero', 'Rasmussen',
  'Sorrentino', 'Thibodeaux', 'Ubaldo', 'Vandermeer', 'Whitlock', 'Yarborough',
] as const;

/* RFC 2606 reserved domains — these can never route to a real mailbox. */
const MAIL_DOMAINS = ['example.com', 'example.net', 'example.org'] as const;

export interface Person {
  name: string;
  first: string;
  last: string;
  email: string;
  initials: string;
}

export function person(): Person {
  const first = pick(FIRST);
  const last = pick(LAST);
  const handle = `${first}.${last}`.toLowerCase();
  return {
    name: `${first} ${last}`,
    first,
    last,
    email: `${handle}@${pick(MAIL_DOMAINS)}`,
    initials: (first[0] + last[0]).toUpperCase(),
  };
}

export const people = (n: number) => Array.from({ length: n }, person);

/** "Marisol B." — the short form the console lists use. */
export const shortName = (p: Person) => `${p.first} ${p.last[0]}.`;

/* Masks an address the way the real console does in list views. */
export function maskEmail(email: string) {
  const [handle, domain] = email.split('@');
  const keep = handle.slice(0, 2);
  return `${keep}${'•'.repeat(Math.max(3, handle.length - 2))}@${domain}`;
}

/* ------------------------------- catalogues ------------------------------- */

export const SERVICES = [
  'Portrait Session', 'Event Coverage', 'Brand Shoot', 'Product Set',
  'Editorial Half-Day', 'Headshot Block', 'Venue Walkthrough',
] as const;

export const PRODUCTS = [
  'Archive Tee', 'Field Notes Hoodie', 'Enamel Pin Set', 'Darkroom Mug',
  'Print — 11×14', 'Print — 16×20', 'Sticker Pack', 'Canvas Tote',
] as const;

export const GALLERY_SETS = [
  'Night Market', 'Coastal Run', 'Studio 4B', 'Rooftop Session',
  'Winter Field', 'Backlot', 'The Long Drive', 'Harbor Lights',
] as const;

export const ARTICLES = [
  'What the Archive Keeps',
  'Notes on Working Alone',
  'The Case for Slower Shutters',
  'Everything Is a Draft',
  'A Room With One Window',
  'On Being Unfound',
  'The Second Roll',
  'Letters to the Unbuilt',
] as const;

export const CHANNELS = ['Direct', 'Search', 'Newsletter', 'Affiliate', 'Social', 'Referral'] as const;

export const CITIES = [
  'Austin, TX', 'Portland, OR', 'Chicago, IL', 'Atlanta, GA', 'Denver, CO',
  'Brooklyn, NY', 'Oakland, CA', 'Nashville, TN', 'Toronto, ON', 'Lisbon, PT',
] as const;

/* --------------------------------- series --------------------------------- */

/** A believable walk — trends up, wobbles, never negative. */
export function series(points: number, start: number, drift = 0.06, noise = 0.22): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < points; i++) {
    v = Math.max(start * 0.15, v * (1 + drift * Math.random() + noise * (Math.random() - 0.5)));
    out.push(Math.round(v));
  }
  return out;
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Last `n` month labels ending at the current month. */
export function lastMonths(n: number): string[] {
  const now = new Date().getMonth();
  return Array.from({ length: n }, (_, i) => MONTH_LABELS[(now - (n - 1 - i) + 120) % 12]);
}

/** A clock time inside business hours, e.g. "2:45 PM". */
export function clockTime() {
  const h = rint(9, 18);
  const m = pick([0, 15, 30, 45]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** A relative stamp, e.g. "14m ago". */
export function ago() {
  const n = rint(1, 59);
  return pick([`${n}m ago`, `${rint(1, 23)}h ago`, `${rint(1, 6)}d ago`]);
}

const fmtMins = (m: number) =>
  m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;

/**
 * `n` relative stamps, newest first. A list of independently-random `ago()`
 * strings reads as broken — "36m ago" above "8m ago" in a feed labelled
 * *recent* — so anything rendered in time order draws its stamps from here.
 */
export function timeline(n: number, maxMins = 8640): string[] {
  return Array.from({ length: n }, () => rint(2, maxMins))
    .sort((a, b) => a - b)
    .map(fmtMins);
}

/** A date inside the next three weeks, formatted "Mar 14". */
export function soonDate() {
  const d = new Date();
  d.setDate(d.getDate() + rint(1, 21));
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}
