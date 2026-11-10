/**
 * Turns Venmo and Cash App notification emails into money-tab rows.
 *
 * The site cannot read Gmail, so whoever can (a scheduled import, or the owner
 * pasting a batch) sends each email's id, sender, subject, date and text here.
 * The text can be the full plain-text body or Gmail's snippet: every field this
 * reads appears in the first two hundred characters.
 *
 * What it reads:
 *   Venmo     card receipts, updated totals, "X paid you", Bitcoin sales
 *   Cash App  card spending, updated totals, payments received, Bitcoin buys,
 *             sells, withdrawals and coins received, refunds
 *
 * What it leaves out on purpose: declined payments, transfers between the
 * owner's own accounts (Apple Cash in, cash out to the bank), loan proceeds
 * (money borrowed is not income), Afterpay installments (the purchase is
 * already counted in full) and anything it does not recognise.
 *
 * Pure: no database, no network. The ledger endpoint does the writing.
 */

export type Scope = 'business' | 'personal';

export interface MoneyEmail {
  id: string;
  from: string;
  subject: string;
  /** ISO time the email was sent. */
  date: string;
  text?: string;
}

export interface LedgerRow {
  kind: 'income' | 'expense';
  amount: number;
  occurred_on: string;
  category: string;
  method: string;
  counterparty: string | null;
  note: string | null;
  source: string;
  source_ref: string;
  scope: Scope;
}

export interface Adjustment {
  source: string;
  merchant: string;
  fromCents: number;
  toCents: number;
  occurred_on: string;
  source_ref: string;
  /** The row to log when no earlier purchase matches. */
  fallback: LedgerRow;
}

export interface BitcoinRow {
  occurred_on: string;
  platform: 'Cash App' | 'Venmo';
  action: 'buy' | 'sell' | 'withdraw' | 'receive' | 'bonus';
  usd_cents: number;
  fee_cents: number;
  sats: number | null;
  note: string | null;
  source: string;
  source_ref: string;
}

export type Parsed =
  | { type: 'ledger'; row: LedgerRow }
  | { type: 'adjust'; adjust: Adjustment }
  | { type: 'bitcoin'; row: BitcoinRow }
  | { type: 'skip'; reason: string };

export const VENMO_SOURCE = 'gmail_venmo';
export const CASHAPP_SOURCE = 'gmail_cashapp';

/** The owner is in Austin, so a purchase at 11pm Central is that day's. */
export function centralDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "$1,234.56" or "1,234.56" or "$16 00" → 123456 cents. */
export function toCents(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, ' ').trim();
  const spaced = cleaned.match(/^(\d+)\s+(\d{2})$/);
  const n = spaced ? Number(`${spaced[1]}.${spaced[2]}`) : Number(cleaned.replace(/\s/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

const sats = (raw: string) => {
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
};

/** "SHELL 57545847303" → "SHELL"; "7-ELEVEN 35878" → "7-ELEVEN". */
export function cleanMerchant(raw: string): string {
  return raw.replace(/\s*-\s*$/, '').replace(/(\s+#?\d{3,})+$/, '').replace(/\s+/g, ' ').trim();
}

const BUSINESS: [RegExp, string][] = [
  [/adobe|lightroom|github|vercel|supabase|google|gsuite|workspace|openai|anthropic|claude|dropbox|squarespace|godaddy|namecheap|cloudflare|notion|figma|canva|zoom|apple\.com\/bill|icloud/i, 'software'],
  [/b\s*&\s*h|bhphoto|adorama|camera|canon|nikon|sony|fujifilm|sigma|lens|samy'?s|precision camera|keh/i, 'gear'],
  [/prodigi|printful|mpix|bay photo|whcc|vistaprint|moo\b|fedex|ups\b|usps|staples|office ?depot|uline/i, 'supplies'],
];

const TRAVEL = /shell|chevron|exxon|mobil|valero|texaco|circle ?k|7-?eleven|buc-?ee|conoco|phillips 66|citgo|gulf|sunoco|lime|uber|lyft|parking|park ?mobile|metro|capmetro|airline|southwest|american air|delta|united/i;
const FOOD = /whole ?foods|h-?e-?b|grocery|market|trader joe|taco|terry|burger|pizza|coffee|cafe|caf[eé]|kitchen|bar\b|pub|tavern|brew|lucky duck|glassmith|volstead|industry|doordash|uber ?eats|grubhub|restaurant|grill|diner|bakery|donut|chipotle|starbucks|mcdonald|wendy|sonic|whataburger|7-?eleven/i;

/**
 * A first guess from the merchant's name. Software, camera gear and print or
 * shipping costs read as business; everything else as personal. The owner can
 * flip any row on the money tab.
 */
export function guessExpense(merchant: string): { category: string; scope: Scope } {
  for (const [re, category] of BUSINESS) if (re.test(merchant)) return { category, scope: 'business' };
  if (TRAVEL.test(merchant) && !/7-?eleven/i.test(merchant)) return { category: 'travel', scope: 'personal' };
  if (FOOD.test(merchant)) return { category: 'food', scope: 'personal' };
  return { category: 'other', scope: 'personal' };
}

function income(email: MoneyEmail, source: string, method: string, who: string, cents: number, note: string | null, day: string): Parsed {
  return {
    type: 'ledger',
    row: {
      kind: 'income', amount: cents / 100, occurred_on: day,
      // Nearly every person-to-person payment is for photos (street, shoots),
      // as with the Venmo income already logged.
      category: 'photos',
      method, counterparty: who.trim() || null, note: note?.trim() || null,
      source, source_ref: email.id, scope: 'business',
    },
  };
}

function spend(email: MoneyEmail, source: string, method: string, merchantRaw: string, cents: number, day: string): LedgerRow {
  const merchant = cleanMerchant(merchantRaw);
  const g = guessExpense(merchant);
  return {
    kind: 'expense', amount: cents / 100, occurred_on: day,
    category: g.category, method, counterparty: merchant, note: null,
    source, source_ref: email.id, scope: g.scope,
  };
}

function parseVenmo(e: MoneyEmail, day: string): Parsed {
  const s = e.subject.trim();
  const t = (e.text ?? '').replace(/\s+/g, ' ');
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^Receipt from (.+?) - \$([\d,]+\.\d{2})$/))) {
    return { type: 'ledger', row: spend(e, VENMO_SOURCE, 'Venmo', m[1], toCents(m[2]), day) };
  }

  if ((m = s.match(/^Updated total from (.+)$/))) {
    const a = t.match(/authorized a charge for \$([\d,]+\.\d{2})\.?\s*Your new total is \$([\d,]+[ .]\d{2})/i);
    if (!a) return { type: 'skip', reason: 'updated total without amounts' };
    const merchant = cleanMerchant(m[1]);
    const toC = toCents(a[2]);
    return {
      type: 'adjust',
      adjust: {
        source: VENMO_SOURCE, merchant, fromCents: toCents(a[1]), toCents: toC, occurred_on: day,
        source_ref: e.id, fallback: spend(e, VENMO_SOURCE, 'Venmo', m[1], toC, day),
      },
    };
  }

  if ((m = s.match(/^(.+?) paid you \$([\d,]+\.\d{2})$/))) {
    // "Nicole Kuhn paid you $ 10 . 00 Pics See transaction …"
    // The note sits between the last "paid you $ 10 . 00" and "See transaction".
    const before = t.split(/ See transaction/i)[0] ?? '';
    const tail = before.split(/paid you \$ ?[\d,]+ ?\. ?\d{2}/i).pop()?.trim();
    const note = tail && tail !== before.trim() ? tail : null;
    const dated = t.match(/Transaction details Date ([A-Z][a-z]{2} \d{1,2}, \d{4})/)?.[1];
    const when = dated ? centralDay(`${dated} 12:00 GMT-0600`) || day : day;
    return income(e, VENMO_SOURCE, 'Venmo', m[1], toCents(m[2]), note, when);
  }

  if ((m = s.match(/^You received \$([\d,]+\.\d{2}) USD for selling ([\d.]+) Bitcoin/i))) {
    return {
      type: 'bitcoin',
      row: {
        occurred_on: day, platform: 'Venmo', action: 'sell', usd_cents: toCents(m[1]), fee_cents: 0,
        sats: Math.round(Number(m[2]) * 1e8), note: 'Amount credited, after fees', source: VENMO_SOURCE, source_ref: e.id,
      },
    };
  }

  if (/transfer|transaction history|bitcoin \(btc\) transfer/i.test(s)) return { type: 'skip', reason: 'transfer between own accounts' };
  return { type: 'skip', reason: 'not a money email' };
}

function parseCashApp(e: MoneyEmail, day: string): Parsed {
  const s = e.subject.trim();
  const t = (e.text ?? '').replace(/\s+/g, ' ');
  let m: RegExpMatchArray | null;

  if (/declined/i.test(s)) return { type: 'skip', reason: 'declined' };

  if ((m = s.match(/^You spent \$([\d,]+\.\d{2}) at (.+)$/))) {
    return { type: 'ledger', row: spend(e, CASHAPP_SOURCE, 'Cash App', m[2], toCents(m[1]), day) };
  }

  if ((m = s.match(/^The total for your transaction at (.+) has been updated from \$([\d,]+\.\d{2}) to \$([\d,]+\.\d{2})$/))) {
    const toC = toCents(m[3]);
    return {
      type: 'adjust',
      adjust: {
        source: CASHAPP_SOURCE, merchant: cleanMerchant(m[1]), fromCents: toCents(m[2]), toCents: toC,
        occurred_on: day, source_ref: e.id, fallback: spend(e, CASHAPP_SOURCE, 'Cash App', m[1], toC, day),
      },
    };
  }

  if (/^Payment received$/i.test(s)) {
    const p = t.match(/^(.+?) paid you \$([\d,]+(?:\.\d{2})?)\./);
    if (!p) return { type: 'skip', reason: 'payment without amount' };
    const note = t.match(/ For (.+?) \+\$/)?.[1] ?? null;
    return income(e, CASHAPP_SOURCE, 'Cash App', p[1], toCents(p[2]), note, day);
  }

  if (/^You (sold|purchased) bitcoin$/i.test(s)) {
    const sell = /sold/i.test(s);
    const amount = t.match(sell ? /Total sale amount \$([\d,]+\.\d{2})/ : /Total purchase amount \$([\d,]+\.\d{2})/)?.[1];
    if (!amount) return { type: 'skip', reason: 'bitcoin trade without amount' };
    const fee = t.match(/Fees \$([\d,]+\.\d{2})/)?.[1];
    const coins = t.match(/Bitcoin amount ₿([\d,]+)/)?.[1];
    return {
      type: 'bitcoin',
      row: {
        occurred_on: day, platform: 'Cash App', action: sell ? 'sell' : 'buy', usd_cents: toCents(amount),
        fee_cents: fee ? toCents(fee) : 0, sats: coins ? sats(coins) : null, note: null,
        source: CASHAPP_SOURCE, source_ref: e.id,
      },
    };
  }

  if ((m = s.match(/^Your withdrawal of ₿([\d,]+) is now confirmed/i))) {
    const usd = t.match(/\$([\d,]+\.\d{2})/)?.[1];
    return {
      type: 'bitcoin',
      row: {
        occurred_on: day, platform: 'Cash App', action: 'withdraw', usd_cents: usd ? toCents(usd) : 0, fee_cents: 0,
        sats: sats(m[1]), note: 'Sent out of Cash App', source: CASHAPP_SOURCE, source_ref: e.id,
      },
    };
  }

  if ((m = s.match(/^You received ₿([\d,]+)/i)) || (m = t.match(/You received ₿([\d,]+)/i))) {
    const usd = (s + ' ' + t).match(/\(\$([\d,]+\.\d{2})\)|\$([\d,]+\.\d{2})/);
    const bonus = /bonus|reward|boost/i.test(s + ' ' + t.slice(0, 200));
    return {
      type: 'bitcoin',
      row: {
        occurred_on: day, platform: 'Cash App', action: bonus ? 'bonus' : 'receive',
        usd_cents: usd ? toCents(usd[1] ?? usd[2]) : 0, fee_cents: 0, sats: sats(m[1]), note: null,
        source: CASHAPP_SOURCE, source_ref: e.id,
      },
    };
  }

  // Afterpay installments on a Cash App Card purchase. The purchase itself is
  // already logged in full from its "You spent" email, so counting each
  // installment as well would count the same money twice. The plan's balance
  // lives on the bills list instead.
  if (/^You made a partial payment$/i.test(s)) return { type: 'skip', reason: 'Afterpay installment (purchase already logged)' };

  // A refund back to the Cash App balance is money in. Only the "now
  // available" email counts; the "being processed" one comes first and would
  // log it twice.
  if ((m = s.match(/^Your refund for \$([\d,]+\.\d{2}) from (.+?) is now available/i))) {
    const merchant = cleanMerchant(m[2]);
    return {
      type: 'ledger',
      row: {
        kind: 'income', amount: toCents(m[1]) / 100, occurred_on: day, category: 'other', method: 'Cash App',
        counterparty: merchant, note: 'Refund', source: CASHAPP_SOURCE, source_ref: e.id,
        scope: guessExpense(merchant).scope,
      },
    };
  }
  if (/^Your refund for .+ is being processed/i.test(s)) return { type: 'skip', reason: 'refund still processing' };

  return { type: 'skip', reason: 'not a money email' };
}

export function parseMoneyEmail(e: MoneyEmail): Parsed {
  const day = centralDay(e.date);
  if (!e.id || !day) return { type: 'skip', reason: 'missing id or date' };
  const from = e.from.toLowerCase();
  if (from.endsWith('@venmo.com')) return parseVenmo(e, day);
  if (from === 'cash@square.com') return parseCashApp(e, day);
  return { type: 'skip', reason: 'not from Venmo or Cash App' };
}
