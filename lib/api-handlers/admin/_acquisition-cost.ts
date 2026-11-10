/**
 * What it costs to get a new customer, for the money tab.
 *
 * Acquisition spend is money the business pays out to win a customer:
 *   - affiliate commissions and MLM shares earned by anyone but the owner
 *     (the owner's own code pays the owner, so it is not a cost),
 *   - KING MIDAS payouts once paid, to anyone but the owner,
 *   - anything logged in the ledger as business `marketing` (ads, flyers, promo).
 * Secret Santa is left out until it is handed out, since nothing has left the
 * business before then.
 *
 * A new customer is counted once, in the month of their first payment, from
 * every place the site records one: invoice payments, gallery orders, shop
 * orders, event tickets, and Venmo or Cash App payments in the ledger. Emails
 * match across those sources; Venmo and Cash App only give a name, so someone
 * who paid both by invoice and by Venmo counts twice. The page says so.
 *
 * Upkeep is the website channel: what it costs to keep the site and its tools
 * running (hosting, database, domains, software like Claude). The site brings
 * people in, so the page counts it in cost per customer by default; it is kept
 * in its own figures so the page can also show acquisition spend alone.
 */

export interface CommissionRow { affiliate_id: string | null; amount: number | string | null; status: string | null; order_id: string | null; source_table: string | null; paid_at: string | null; created_at: string | null }
export interface KingMidasRow { affiliate_id: string | null; pool_amount: number | string | null; status: string | null; date: string | null }
export interface MarketingRow { amount_cents: number; occurred_on: string }
/** Upkeep from the ledger or the Stripe card, by day. */
export type UpkeepRow = MarketingRow;
export interface CustomerPayment { key: string; at: string | null }
export interface AffiliateRow { id: string; created_at: string | null }

export interface AcquisitionMonth { month: string; spendCents: number; upkeepCents: number; newCustomers: number; newAffiliates: number }
export interface Acquisition {
  spendCents: number;
  newCustomers: number;
  /** null when there are no new customers to divide by. */
  costPerCustomerCents: number | null;
  newAffiliates: number;
  /** Website and software upkeep over the same span, kept out of spendCents. */
  upkeepCents: number;
  /** Cost per customer with upkeep folded in. null when there are no new customers. */
  costPerCustomerWithUpkeepCents: number | null;
  channels: {
    affiliates: { spendCents: number; customers: number };
    marketing: { spendCents: number };
    kingMidas: { spendCents: number };
    /** Website upkeep, the same figure as upkeepCents. */
    website: { spendCents: number };
    /** Everyone an affiliate did not bring in: word of mouth, street shoots, direct bookings. */
    organic: { customers: number };
  };
  /** Paid to the owner's own affiliate code, shown so the gap is explained. */
  ownerCommissionCents: number;
  monthly: AcquisitionMonth[];
}

const cents = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 100) || 0;
const ym = (at: string | null | undefined) => (at ?? '').slice(0, 7);
const live = (status: string | null) => !status || !['cancelled', 'canceled', 'rejected', 'reversed', 'refunded'].includes(status.toLowerCase());

export function computeAcquisition(input: {
  ownerAffiliateId: string | null;
  commissions: CommissionRow[];
  kingMidas: KingMidasRow[];
  marketing: MarketingRow[];
  payments: CustomerPayment[];
  affiliates: AffiliateRow[];
  upkeep?: UpkeepRow[];
}): Acquisition {
  const months = new Map<string, AcquisitionMonth>();
  const at = (m: string) => {
    let row = months.get(m);
    if (!row) { row = { month: m, spendCents: 0, upkeepCents: 0, newCustomers: 0, newAffiliates: 0 }; months.set(m, row); }
    return row;
  };

  let affiliateSpend = 0, marketingSpend = 0, kingMidasSpend = 0, ownerCommission = 0;
  const referredOrders = new Set<string>();

  for (const c of input.commissions) {
    if (!live(c.status)) continue;
    const amount = cents(c.amount);
    const m = ym(c.paid_at ?? c.created_at);
    if (!amount || !m) continue;
    if (input.ownerAffiliateId && c.affiliate_id === input.ownerAffiliateId) { ownerCommission += amount; continue; }
    affiliateSpend += amount;
    at(m).spendCents += amount;
    // An MLM share rides on a sale another affiliate already brought in.
    if (c.order_id && !String(c.source_table ?? '').toLowerCase().startsWith('mlm')) referredOrders.add(c.order_id);
  }

  for (const k of input.kingMidas) {
    if ((k.status ?? '').toLowerCase() !== 'paid') continue;
    if (input.ownerAffiliateId && k.affiliate_id === input.ownerAffiliateId) continue;
    const amount = cents(k.pool_amount);
    const m = ym(k.date);
    if (!amount || !m) continue;
    kingMidasSpend += amount;
    at(m).spendCents += amount;
  }

  for (const r of input.marketing) {
    const m = ym(r.occurred_on);
    if (!r.amount_cents || !m) continue;
    marketingSpend += r.amount_cents;
    at(m).spendCents += r.amount_cents;
  }

  let upkeepSpend = 0;
  for (const r of input.upkeep ?? []) {
    const m = ym(r.occurred_on);
    if (!r.amount_cents || !m) continue;
    upkeepSpend += r.amount_cents;
    at(m).upkeepCents += r.amount_cents;
  }

  // First payment per customer.
  const first = new Map<string, string>();
  for (const p of input.payments) {
    const key = p.key.trim().toLowerCase();
    const day = (p.at ?? '').slice(0, 10);
    if (!key || !day) continue;
    const seen = first.get(key);
    if (!seen || day < seen) first.set(key, day);
  }
  for (const day of first.values()) at(day.slice(0, 7)).newCustomers++;

  let newAffiliates = 0;
  for (const a of input.affiliates) {
    if (a.id === input.ownerAffiliateId) continue;
    const m = ym(a.created_at);
    if (!m) continue;
    newAffiliates++;
    at(m).newAffiliates++;
  }

  const spendCents = affiliateSpend + marketingSpend + kingMidasSpend;
  const newCustomers = first.size;
  const affiliateCustomers = Math.min(referredOrders.size, newCustomers);
  return {
    spendCents,
    newCustomers,
    costPerCustomerCents: newCustomers ? Math.round(spendCents / newCustomers) : null,
    newAffiliates,
    upkeepCents: upkeepSpend,
    costPerCustomerWithUpkeepCents: newCustomers ? Math.round((spendCents + upkeepSpend) / newCustomers) : null,
    channels: {
      affiliates: { spendCents: affiliateSpend, customers: affiliateCustomers },
      marketing: { spendCents: marketingSpend },
      kingMidas: { spendCents: kingMidasSpend },
      website: { spendCents: upkeepSpend },
      organic: { customers: newCustomers - affiliateCustomers },
    },
    ownerCommissionCents: ownerCommission,
    monthly: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
  };
}

const TEST_EMAIL = /(test|demo|example\.com|\+test)/i;
const paidish = (s: string | null) => !!s && ['paid', 'completed', 'succeeded', 'confirmed'].includes(s.toLowerCase());

/** Ledger categories that count as upkeep: the tools and hosting the business runs on. */
export const UPKEEP_CATEGORIES = new Set(['software', 'website']);

/**
 * Reads what computeAcquisition needs. `ledger` is the money_ledger rows already
 * loaded; `stripeUpkeep` is card spend at website merchants (Vercel, Supabase).
 */
export async function loadAcquisition(supabase: any, ownerAffiliateId: string | null, ledger: any[], stripeUpkeep: UpkeepRow[] = []): Promise<Acquisition> {
  const [commissions, kingMidas, affiliates, invoicePayments, gallery, shop, tickets] = await Promise.all([
    supabase.from('affiliate_commissions').select('affiliate_id, amount, status, order_id, source_table, paid_at, created_at'),
    supabase.from('king_midas_payouts').select('affiliate_id, pool_amount, status, date'),
    supabase.from('affiliates').select('id, created_at'),
    supabase.from('invoice_payments').select('paid_at, invoices ( client_id, clients ( email ) )'),
    supabase.from('photo_orders').select('email, payment_status, created_at'),
    supabase.from('shop_orders').select('customer_email, status, paid_at'),
    supabase.from('event_tickets').select('customer_email, status, created_at'),
  ]);
  for (const r of [commissions, kingMidas, affiliates, invoicePayments, gallery, shop, tickets]) if (r.error) throw r.error;

  const payments: CustomerPayment[] = [];
  for (const p of invoicePayments.data ?? []) {
    const inv = p.invoices;
    const key = inv?.clients?.email || (inv?.client_id ? `client:${inv.client_id}` : '');
    if (key && !TEST_EMAIL.test(key)) payments.push({ key, at: p.paid_at });
  }
  for (const o of gallery.data ?? []) if (paidish(o.payment_status) && o.email && !TEST_EMAIL.test(o.email)) payments.push({ key: o.email, at: o.created_at });
  for (const o of shop.data ?? []) if (paidish(o.status) && o.customer_email && !TEST_EMAIL.test(o.customer_email)) payments.push({ key: o.customer_email, at: o.paid_at });
  for (const t of tickets.data ?? []) if (paidish(t.status) && t.customer_email && !TEST_EMAIL.test(t.customer_email)) payments.push({ key: t.customer_email, at: t.created_at });
  for (const e of ledger) {
    if (e.kind === 'income' && e.scope !== 'personal' && e.counterparty) payments.push({ key: `name:${e.counterparty}`, at: e.occurred_on });
  }

  const marketing: MarketingRow[] = ledger
    .filter(e => e.kind === 'expense' && e.category === 'marketing' && e.scope !== 'personal')
    .map(e => ({ amount_cents: e.amount_cents, occurred_on: e.occurred_on }));

  const upkeep: UpkeepRow[] = [
    ...ledger
      .filter(e => e.kind === 'expense' && UPKEEP_CATEGORIES.has(e.category) && e.scope !== 'personal')
      .map(e => ({ amount_cents: e.amount_cents, occurred_on: e.occurred_on })),
    ...stripeUpkeep,
  ];

  return computeAcquisition({
    ownerAffiliateId,
    upkeep,
    commissions: commissions.data ?? [],
    kingMidas: kingMidas.data ?? [],
    marketing,
    payments,
    affiliates: affiliates.data ?? [],
  });
}
