/**
 * DEMO MODE — real content, different numbers.
 *
 * The demo is not a fake site. Photos are the real photos, merch is the real
 * merch, every page is the page. What must not be real is the *figures* —
 * revenue, order counts, subscriber totals, commission, anything that describes
 * how the business is actually doing. Somebody walking the demo should be able
 * to click every button and see the whole system working, without learning what
 * I made last month.
 *
 * So numbers pass through here on the way to the screen. `scramble` is a pure
 * function of the value and a key, which buys two properties that matter:
 *
 *   • Stable — the same number scrambles to the same number every load, for
 *     everybody. Two people looking at the demo are looking at the same demo.
 *     A figure that reshuffles on refresh is obviously noise and teaches nobody
 *     anything about how the numbers relate.
 *
 *   • Proportional — a value is shifted within a band, never replaced. Totals
 *     still roughly equal the sum of their parts, big clients still outrank
 *     small ones, an upward trend stays upward. The *relationships* are the
 *     thing being demonstrated; only the magnitudes are false.
 *
 * It is deliberately not reversible in any useful way — the band is wide enough
 * that you cannot back out the original from the displayed value.
 */

/** FNV-1a over the key — cheap, stable, no dependencies. */
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic factor in [1 - spread, 1 + spread] for a given key. */
function factorFor(key: string, spread: number): number {
  const unit = hashKey(key) / 4294967296; // [0, 1)
  return 1 + (unit * 2 - 1) * spread;
}

/**
 * Shift a figure within ±`spread` (default 40%), keyed so it never changes.
 * Zero stays zero — an empty state is a real state and faking it into a number
 * would misrepresent how the UI behaves when there is nothing there.
 */
export function scramble(value: number, key: string, spread = 0.4): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const scaled = value * factorFor(key, spread);
  // Preserve integer-ness: an order count of 12.4 is a tell.
  return Number.isInteger(value) ? Math.max(1, Math.round(scaled)) : Number(scaled.toFixed(2));
}

/** Money in cents, kept whole. */
export function scrambleCents(cents: number, key: string, spread = 0.4): number {
  return Math.round(scramble(cents, key, spread));
}

/**
 * Scramble a whole series while keeping its shape — every point takes the same
 * factor, so the trend, the peaks and the dips all survive. Scrambling each
 * point independently would flatten the line into noise, which destroys the one
 * thing a chart is for.
 */
export function scrambleSeries(values: number[], key: string, spread = 0.4): number[] {
  const f = factorFor(key, spread);
  return values.map(v => (Number.isInteger(v) ? Math.max(0, Math.round(v * f)) : Number((v * f).toFixed(2))));
}

/**
 * Scramble the numeric fields of a row, leaving everything else — names, image
 * URLs, slugs, descriptions, timestamps — exactly as it came from the database.
 * This is the main entry point: real record in, real record out, different money.
 *
 *   scrambleRow(order, ['total', 'quantity'], `order:${order.id}`)
 */
export function scrambleRow<T extends Record<string, unknown>>(
  row: T,
  numericFields: (keyof T)[],
  key: string,
  spread = 0.4,
): T {
  const out = { ...row };
  for (const field of numericFields) {
    const v = out[field];
    if (typeof v === 'number') {
      out[field] = scramble(v, `${key}:${String(field)}`, spread) as T[keyof T];
    }
  }
  return out;
}

/** The same, across a list. */
export function scrambleRows<T extends Record<string, unknown>>(
  rows: T[],
  numericFields: (keyof T)[],
  keyOf: (row: T, index: number) => string,
  spread = 0.4,
): T[] {
  return rows.map((row, i) => scrambleRow(row, numericFields, keyOf(row, i), spread));
}

/**
 * Names and emails, when a row would otherwise identify a real customer. Photos
 * and products keep their real titles — those are public anyway — but an order
 * carries a person on it, and that person did not agree to be in a demo.
 */
const DEMO_NAMES = [
  'Dana Ruiz', 'Priya Nair', 'Sam Okoye', 'Marco Vieira', 'Hannah Colestock',
  'Ada Bello', 'Ellis Kwan', 'Rosa Marchetti', 'Theo Lindqvist', 'Naomi Park',
  'Curtis Amaro', 'Lena Fitzgerald', 'Omar Haddad', 'Bea Whitlock', 'Jonas Reyes',
];

export function demoName(key: string): string {
  return DEMO_NAMES[hashKey(key) % DEMO_NAMES.length];
}

export function demoEmail(key: string): string {
  const name = demoName(key).toLowerCase().replace(/[^a-z]+/g, '.');
  return `${name}@example.com`;
}
