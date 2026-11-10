import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/api-handlers/crew/_shared.js';
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js';
import { OWNER_AFFILIATE_CODE } from '../../lib/api-handlers/affiliates/_referral-tie.js';
import { stripeMoneyOut, type CardSpend } from '../../lib/api-handlers/admin/_stripe-money-out.js';
import { parseMoneyEmail, type MoneyEmail, type LedgerRow, type Adjustment, type BitcoinRow } from '../../lib/api-handlers/admin/_money-email-parse.js';

/**
 * Money in and money out, in one place.
 *
 *   GET                         → ledger entries + a monthly income/expense summary
 *   POST { action: 'create' }   → log one entry (a Venmo payment, a gear purchase)
 *   POST { action: 'import' }   → log many, skipping any source_ref already stored
 *   POST { action: 'import-emails' } → read Venmo and Cash App emails into the
 *                                 ledger and Bitcoin activity (see _money-email-parse)
 *   POST { action: 'scope' }    → mark an entry business or personal
 *   POST { action: 'account-save' } → set a balance the site cannot read (Venmo, Cash App)
 *   DELETE ?id=                 → remove an entry logged by mistake
 *
 *   GET ?view=bills             → active bills and loans only (the calendar's red dots)
 *   POST { action: 'bill-save' }→ add or edit a bill / loan
 *   POST { action: 'bill-paid' }→ log the payment as an expense, roll next_due forward,
 *                                 and for a loan, pay down the balance
 *   DELETE ?bill=               → stop tracking a bill
 *
 * The summary folds in what the site already records — gallery, shop, ticket,
 * street and invoice income; photographer payouts, print costs, refunds — and
 * what Stripe records — business card spending, Stripe's fees, commissions,
 * the owner's pay — so the ledger only has to hold what neither sees: direct
 * payments and cash or outside-card expenses.
 *
 * Financial records, so the gate is verifyAdmin: a verified admin session or
 * ADMIN_SECRET, never the spoofable x-admin-email header or a Host header.
 */

export const INCOME_CATEGORIES = ['photos', 'services', 'shop', 'tickets', 'street', 'other'] as const;
export const EXPENSE_CATEGORIES = ['gear', 'software', 'website', 'loan', 'travel', 'food', 'supplies', 'crew', 'prints', 'marketing', 'fees', 'commissions', 'owner_pay', 'refunds', 'other'] as const;
export const BILL_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;
const BILL_FREQUENCIES = ['monthly', 'yearly', 'once'] as const;
const BILL_SELECT = 'id, name, kind, category, amount_cents, balance_cents, frequency, next_due, priority, pay_from, notes, active';
const ENTRY_SELECT = 'id, kind, amount_cents, occurred_on, category, method, counterparty, note, source, source_ref, scope, created_at';
const ACCOUNT_SELECT = 'id, name, balance_cents, as_of, notes';
const BITCOIN_SELECT = 'id, occurred_on, platform, action, usd_cents, fee_cents, sats, note, source';
const SCOPES = ['business', 'personal'] as const;

/** The next due date after `ymd`, keeping the day of month where the month allows. */
function rollForward(ymd: string, frequency: string): string | null {
  if (frequency === 'once') return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const months = frequency === 'yearly' ? 12 : 1;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function toBillRow(b: any): { row?: Record<string, unknown>; error?: string } {
  const name = String(b?.name ?? '').trim();
  if (!name) return { error: 'name is required' };
  if (!b?.next_due || !/^\d{4}-\d{2}-\d{2}$/.test(b.next_due)) return { error: 'next_due must be YYYY-MM-DD' };
  const kind = b.kind === 'loan' ? 'loan' : 'bill';
  const priority = BILL_PRIORITIES.includes(b.priority) ? b.priority : 'normal';
  const frequency = BILL_FREQUENCIES.includes(b.frequency) ? b.frequency : 'monthly';
  const cents = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Math.round(Number(v) * 100);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    row: {
      name, kind, priority, frequency,
      category: String(b.category || (kind === 'loan' ? 'loan' : 'website')).toLowerCase(),
      amount_cents: cents(b.amount),
      balance_cents: kind === 'loan' ? cents(b.balance) : null,
      next_due: b.next_due,
      pay_from: b.pay_from?.trim() || null,
      notes: b.notes?.trim() || null,
    },
  };
}

/** revenue-data-validator: test/demo/admin traffic is not revenue. */
const TEST_EMAIL = /(test|demo|example\.com|\+test)/i;
/** Invoices carry no service type, so photo work is read off the description. */
const PHOTO_WORK = /(photo|shoot|headshot|portrait|wedding|gallery|video)/i;

const paidish = (s: string | null) => !!s && ['paid', 'completed', 'succeeded', 'confirmed'].includes(s.toLowerCase());

interface EntryInput {
  kind?: string;
  amount?: number | string;
  occurred_on?: string;
  category?: string;
  method?: string | null;
  counterparty?: string | null;
  note?: string | null;
  source?: string;
  source_ref?: string | null;
  scope?: string;
}

function toRow(e: EntryInput): { row?: Record<string, unknown>; error?: string } {
  const kind = e.kind === 'expense' ? 'expense' : e.kind === 'income' ? 'income' : null;
  if (!kind) return { error: 'kind must be income or expense' };
  const cents = Math.round(Number(e.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return { error: 'amount must be a positive number' };
  if (!e.occurred_on || !/^\d{4}-\d{2}-\d{2}$/.test(e.occurred_on)) return { error: 'occurred_on must be YYYY-MM-DD' };
  const allowed: readonly string[] = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = (e.category || 'other').toLowerCase();
  if (!allowed.includes(category)) return { error: `category must be one of ${allowed.join(', ')}` };
  return {
    row: {
      kind,
      amount_cents: cents,
      occurred_on: e.occurred_on,
      category,
      method: e.method?.trim() || null,
      counterparty: e.counterparty?.trim() || null,
      note: e.note?.trim() || null,
      source: e.source?.trim() || 'manual',
      source_ref: e.source_ref?.trim() || null,
      scope: e.scope === 'personal' ? 'personal' : 'business',
    },
  };
}

interface Line { month: string; kind: 'income' | 'expense'; category: string; cents: number; origin: 'site' | 'ledger' | 'stripe'; personal?: boolean }

/**
 * Every dollar in and out, from every place the site records one. The income
 * side reads the same tables, with the same rules, as /api/admin/revenue-summary
 * (the revenue widget), so the two agree. The money-out side adds what Stripe
 * knows and the site never wrote down: card spending, Stripe's fees, affiliate
 * commissions and the owner's pay.
 */
async function buildSummary(supabase: ReturnType<typeof getSupabaseAdmin>, ledger: any[]) {
  const [gallery, payments, prodigi, shop, tickets, nights, streetDeposits, refunds, owner] = await Promise.all([
    supabase.from('photo_orders').select('email, total_amount_cents, payment_status, created_at'),
    supabase.from('invoice_payments').select('amount, paid_at, invoice_id, invoices ( description, contractor_payout )'),
    supabase.from('prodigi_orders').select('unit_cost, copies, status, paid_at').not('status', 'eq', 'cancelled'),
    supabase.from('shop_orders').select('customer_email, amount_total_cents, paid_at, status'),
    supabase.from('event_tickets').select('customer_email, purchase_amount_cents, status, created_at'),
    supabase.from('field_sales').select('night, total'),
    // Outside deposits tagged street. Ones tagged invoice are already counted
    // as the invoice payment, so they are left out here, as in revenue-summary.
    supabase.from('deposit_checkins').select('amount_cents, received_at').eq('category', 'street'),
    supabase.from('refunds').select('amount_cents, created_at'),
    supabase.from('affiliates').select('stripe_account_id')
      .or(`code.eq.${OWNER_AFFILIATE_CODE},affiliate_code.eq.${OWNER_AFFILIATE_CODE}`).maybeSingle(),
  ]);

  const lines: Line[] = [];
  const month = (at: string | null) => (at ?? '').slice(0, 7);

  for (const o of gallery.data ?? []) {
    if (!paidish(o.payment_status) || TEST_EMAIL.test(o.email ?? '')) continue;
    lines.push({ month: month(o.created_at), kind: 'income', category: 'photos', cents: o.total_amount_cents ?? 0, origin: 'site' });
  }

  for (const o of shop.data ?? []) {
    if (!paidish(o.status) || TEST_EMAIL.test(o.customer_email ?? '')) continue;
    lines.push({ month: month(o.paid_at), kind: 'income', category: 'shop', cents: o.amount_total_cents ?? 0, origin: 'site' });
  }

  for (const t of tickets.data ?? []) {
    if (!paidish(t.status) || TEST_EMAIL.test(t.customer_email ?? '')) continue;
    lines.push({ month: month(t.created_at), kind: 'income', category: 'tickets', cents: t.purchase_amount_cents ?? 0, origin: 'site' });
  }

  for (const n of nights.data ?? []) {
    lines.push({ month: month(n.night), kind: 'income', category: 'street', cents: Math.round(Number(n.total ?? 0) * 100), origin: 'site' });
  }

  for (const d of streetDeposits.data ?? []) {
    lines.push({ month: month(d.received_at), kind: 'income', category: 'street', cents: d.amount_cents ?? 0, origin: 'site' });
  }

  for (const r of refunds.data ?? []) {
    lines.push({ month: month(r.created_at), kind: 'expense', category: 'refunds', cents: r.amount_cents ?? 0, origin: 'site' });
  }

  // A photographer is owed once per invoice, not once per instalment — the
  // same rule revenue-summary applies. Date it at the first payment.
  const payoutSeen = new Set<string>();
  const sortedPayments = [...(payments.data ?? [])].sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)));
  for (const p of sortedPayments as any[]) {
    const desc = p.invoices?.description ?? '';
    lines.push({
      month: month(p.paid_at), kind: 'income',
      category: PHOTO_WORK.test(desc) ? 'photos' : 'services',
      cents: Math.round(Number(p.amount ?? 0) * 100), origin: 'site',
    });
    const payout = Math.round(Number(p.invoices?.contractor_payout ?? 0) * 100);
    if (p.invoice_id && !payoutSeen.has(p.invoice_id)) {
      payoutSeen.add(p.invoice_id);
      if (payout > 0) lines.push({ month: month(p.paid_at), kind: 'expense', category: 'crew', cents: payout, origin: 'site' });
    }
  }

  for (const p of prodigi.data ?? []) {
    if (!p.paid_at) continue;
    const cents = Math.round(Number(p.unit_cost ?? 0) * 100) * (p.copies ?? 1);
    if (cents > 0) lines.push({ month: month(p.paid_at), kind: 'expense', category: 'prints', cents, origin: 'site' });
  }

  for (const e of ledger) {
    lines.push({ month: month(e.occurred_on), kind: e.kind, category: e.category, cents: e.amount_cents, origin: 'ledger', personal: e.scope === 'personal' });
  }

  // Stripe is read live. If it fails, the rest of the summary still loads and
  // the page says money out is missing Stripe, rather than quietly showing less.
  let stripeError: string | null = null;
  let cardSpend: CardSpend[] = [];
  try {
    const out = await stripeMoneyOut(owner.data?.stripe_account_id ?? null);
    cardSpend = out.cardSpend.slice(0, 50);
    for (const l of out.lines) {
      lines.push({ month: l.day.slice(0, 7), kind: 'expense', category: l.category, cents: l.cents, origin: 'stripe' });
    }
  } catch (err: any) {
    stripeError = err?.message || 'Stripe lookup failed';
  }

  // personalExpenseCents is inside expenseCents: it is real money out for cash
  // and runway, and is taken back out for profit and the tax set-aside.
  type Month = { month: string; incomeCents: number; expenseCents: number; photoIncomeCents: number; ownerPayCents: number; personalExpenseCents: number };
  const months = new Map<string, Month>();
  const byCategory = { income: {} as Record<string, number>, expense: {} as Record<string, number> };
  let siteIncome = 0, ledgerIncome = 0, stripeExpense = 0, personalExpense = 0;
  for (const l of lines) {
    // Negative lines are real: a refund on the business card brings money back.
    if (!l.month || !l.cents) continue;
    const m = months.get(l.month) ?? { month: l.month, incomeCents: 0, expenseCents: 0, photoIncomeCents: 0, ownerPayCents: 0, personalExpenseCents: 0 };
    if (l.kind === 'income') {
      if (l.cents < 0) continue;
      m.incomeCents += l.cents;
      if (l.category === 'photos') m.photoIncomeCents += l.cents;
      if (l.origin === 'ledger') ledgerIncome += l.cents; else siteIncome += l.cents;
    } else {
      m.expenseCents += l.cents;
      if (l.category === 'owner_pay') m.ownerPayCents += l.cents;
      if (l.origin === 'stripe') stripeExpense += l.cents;
      if (l.personal) { m.personalExpenseCents += l.cents; personalExpense += l.cents; }
    }
    byCategory[l.kind][l.category] = (byCategory[l.kind][l.category] ?? 0) + l.cents;
    months.set(l.month, m);
  }

  const monthly = [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
  const incomeCents = monthly.reduce((n, m) => n + m.incomeCents, 0);
  const expenseCents = monthly.reduce((n, m) => n + m.expenseCents, 0);
  return {
    totals: {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      photoIncomeCents: byCategory.income.photos ?? 0,
      siteIncomeCents: siteIncome,
      directIncomeCents: ledgerIncome,
      stripeExpenseCents: stripeExpense,
      ownerPayCents: byCategory.expense.owner_pay ?? 0,
      personalExpenseCents: personalExpense,
    },
    byCategory,
    monthly,
    cardSpend,
    stripeError,
  };
}

const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/**
 * Venmo and Cash App emails into the ledger and Bitcoin activity. Safe to run
 * again on the same emails: each email's id is its source_ref, so nothing is
 * logged twice, and an updated total that was already applied is left alone.
 */
async function importEmails(supabase: ReturnType<typeof getSupabaseAdmin>, emails: MoneyEmail[]) {
  const ledger: LedgerRow[] = [];
  const adjusts: Adjustment[] = [];
  const bitcoin: BitcoinRow[] = [];
  const skipped: Record<string, number> = {};
  const ordered = [...emails].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const e of ordered) {
    const p = parseMoneyEmail({ id: String(e?.id ?? ''), from: String(e?.from ?? ''), subject: String(e?.subject ?? ''), date: String(e?.date ?? ''), text: e?.text ? String(e.text) : '' });
    if (p.type === 'ledger') ledger.push(p.row);
    else if (p.type === 'adjust') adjusts.push(p.adjust);
    else if (p.type === 'bitcoin') bitcoin.push(p.row);
    else skipped[p.reason] = (skipped[p.reason] ?? 0) + 1;
  }

  // Ledger rows, minus what is already stored.
  let inserted = 0;
  const rows = ledger.map(r => toRow(r).row).filter(Boolean) as Record<string, unknown>[];
  const refs = rows.map(r => r.source_ref as string);
  const seen = new Set<string>();
  for (let i = 0; i < refs.length; i += 200) {
    const { data, error } = await supabase.from('money_ledger').select('source, source_ref').in('source_ref', refs.slice(i, i + 200));
    if (error) throw error;
    for (const d of data ?? []) seen.add(`${d.source}:${d.source_ref}`);
  }
  const fresh = rows.filter(r => !seen.has(`${r.source}:${r.source_ref}`));
  for (let i = 0; i < fresh.length; i += 200) {
    const { error } = await supabase.from('money_ledger').insert(fresh.slice(i, i + 200));
    if (error) throw error;
  }
  inserted = fresh.length;

  // An updated total replaces the amount of the purchase it corrects: the same
  // merchant and the old amount, in the week before. If that purchase is not
  // on file, the corrected purchase is logged on its own.
  let adjusted = 0;
  for (const a of adjusts) {
    const window = { from: addDays(a.occurred_on, -7), to: a.occurred_on };
    const match = (cents: number) => supabase.from('money_ledger').select('id, note')
      .eq('source', a.source).eq('kind', 'expense').eq('counterparty', a.merchant).eq('amount_cents', cents)
      .gte('occurred_on', window.from).lte('occurred_on', window.to)
      .order('occurred_on', { ascending: false }).limit(1);
    const done = await match(a.toCents);
    if (done.error) throw done.error;
    const own = await supabase.from('money_ledger').select('id').eq('source', a.source).eq('source_ref', a.source_ref).limit(1);
    if (own.error) throw own.error;
    if ((done.data ?? []).length || (own.data ?? []).length) continue;
    const orig = await match(a.fromCents);
    if (orig.error) throw orig.error;
    const row = orig.data?.[0];
    if (row) {
      const note = `Total updated from $${(a.fromCents / 100).toFixed(2)}`;
      const { error } = await supabase.from('money_ledger').update({ amount_cents: a.toCents, note: row.note ? `${row.note} · ${note}` : note }).eq('id', row.id);
      if (error) throw error;
    } else {
      const { row: fallback } = toRow({ ...a.fallback, note: `Total updated from $${(a.fromCents / 100).toFixed(2)}` });
      const { error } = await supabase.from('money_ledger').insert(fallback);
      if (error) throw error;
    }
    adjusted++;
  }

  // Bitcoin activity, minus what is already stored.
  const btcSeen = new Set<string>();
  const btcRefs = bitcoin.map(b => b.source_ref);
  for (let i = 0; i < btcRefs.length; i += 200) {
    const { data, error } = await supabase.from('bitcoin_activity').select('source, source_ref').in('source_ref', btcRefs.slice(i, i + 200));
    if (error) throw error;
    for (const d of data ?? []) btcSeen.add(`${d.source}:${d.source_ref}`);
  }
  const btcFresh = bitcoin.filter(b => !btcSeen.has(`${b.source}:${b.source_ref}`));
  if (btcFresh.length) {
    const { error } = await supabase.from('bitcoin_activity').insert(btcFresh);
    if (error) throw error;
  }

  return {
    read: emails.length,
    inserted,
    alreadyLogged: rows.length - inserted,
    adjusted,
    bitcoinInserted: btcFresh.length,
    skipped,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' });
  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET' && req.query.view === 'bills') {
      const { data, error } = await supabase.from('bills').select(BILL_SELECT).eq('active', true).order('next_due');
      if (error) throw error;
      return res.status(200).json({ bills: data ?? [] });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('money_ledger')
        .select(ENTRY_SELECT)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const [summary, bills, accounts, bitcoin] = await Promise.all([
        buildSummary(supabase, data ?? []),
        supabase.from('bills').select(BILL_SELECT).eq('active', true).order('next_due'),
        supabase.from('money_accounts').select(ACCOUNT_SELECT).eq('active', true).order('name'),
        supabase.from('bitcoin_activity').select(BITCOIN_SELECT).order('occurred_on', { ascending: false }).limit(500),
      ]);
      if (bills.error) throw bills.error;
      if (accounts.error) throw accounts.error;
      if (bitcoin.error) throw bitcoin.error;
      return res.status(200).json({
        entries: data ?? [],
        bills: bills.data ?? [],
        accounts: accounts.data ?? [],
        bitcoin: bitcoin.data ?? [],
        summary,
        categories: { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES },
      });
    }

    if (req.method === 'DELETE' && req.query.bill) {
      // Soft stop: the bill's history stays in the ledger as expenses.
      const { data, error } = await supabase.from('bills').update({ active: false }).eq('id', req.query.bill as string).select('id');
      if (error) throw error;
      return res.status(200).json({ stopped: data?.length ?? 0 });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('money_ledger').delete().eq('id', id).select('id');
      if (error) throw error;
      return res.status(200).json({ deleted: data?.length ?? 0 });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const action = req.body?.action;

    if (action === 'create') {
      const { row, error: invalid } = toRow(req.body?.entry ?? {});
      if (!row) return res.status(400).json({ error: invalid });
      const { data, error } = await supabase.from('money_ledger').insert(row).select().single();
      if (error) throw error;
      return res.status(200).json({ entry: data });
    }

    if (action === 'import') {
      const input: EntryInput[] = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const rows: Record<string, unknown>[] = [];
      for (const [i, e] of input.entries()) {
        const { row, error: invalid } = toRow(e);
        if (!row) return res.status(400).json({ error: `entry ${i}: ${invalid}` });
        rows.push(row);
      }
      // Skip what is already stored, so re-running an import never double-counts.
      const refs = rows.map(r => r.source_ref).filter(Boolean) as string[];
      const { data: existing, error: lookupError } = refs.length
        ? await supabase.from('money_ledger').select('source, source_ref').in('source_ref', refs)
        : { data: [], error: null };
      if (lookupError) throw lookupError;
      const seen = new Set((existing ?? []).map(e => `${e.source}:${e.source_ref}`));
      const fresh = rows.filter(r => !r.source_ref || !seen.has(`${r.source}:${r.source_ref}`));
      if (fresh.length) {
        const { error } = await supabase.from('money_ledger').insert(fresh);
        if (error) throw error;
      }
      return res.status(200).json({ inserted: fresh.length, skipped: rows.length - fresh.length });
    }

    if (action === 'import-emails') {
      const emails: MoneyEmail[] = Array.isArray(req.body?.emails) ? req.body.emails : [];
      if (emails.length > 2000) return res.status(400).json({ error: 'send at most 2000 emails at a time' });
      const result = await importEmails(supabase, emails);
      return res.status(200).json(result);
    }

    if (action === 'scope') {
      const { id, scope } = req.body || {};
      if (!id || !(SCOPES as readonly string[]).includes(scope)) return res.status(400).json({ error: 'id and scope (business or personal) are required' });
      const { data, error } = await supabase.from('money_ledger').update({ scope }).eq('id', id).select(ENTRY_SELECT).maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Entry not found' });
      return res.status(200).json({ entry: data });
    }

    if (action === 'account-save') {
      const a = req.body?.account ?? {};
      const name = String(a.name ?? '').trim();
      const cents = Math.round(Number(a.balance) * 100);
      if (!name) return res.status(400).json({ error: 'name is required' });
      if (!Number.isFinite(cents)) return res.status(400).json({ error: 'balance must be a number' });
      const asOf = /^\d{4}-\d{2}-\d{2}$/.test(a.as_of ?? '') ? a.as_of : new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from('money_accounts')
        .upsert({ name, balance_cents: cents, as_of: asOf, notes: a.notes?.trim() || null, active: true, updated_at: new Date().toISOString() }, { onConflict: 'name' })
        .select(ACCOUNT_SELECT).single();
      if (error) throw error;
      return res.status(200).json({ account: data });
    }

    if (action === 'bill-save') {
      const { row, error: invalid } = toBillRow(req.body?.bill);
      if (!row) return res.status(400).json({ error: invalid });
      const id = req.body?.bill?.id as string | undefined;
      const query = id
        ? supabase.from('bills').update(row).eq('id', id).select(BILL_SELECT).single()
        : supabase.from('bills').insert(row).select(BILL_SELECT).single();
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json({ bill: data });
    }

    if (action === 'bill-paid') {
      const { id, amount, paid_on, method } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data: bill, error: billError } = await supabase.from('bills').select(BILL_SELECT).eq('id', id).maybeSingle();
      if (billError) throw billError;
      if (!bill) return res.status(404).json({ error: 'Bill not found' });

      const cents = amount !== undefined && amount !== '' ? Math.round(Number(amount) * 100) : bill.amount_cents;
      if (!cents || cents <= 0) return res.status(400).json({ error: 'This bill has no amount on file — pass amount' });
      const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(paid_on ?? '') ? paid_on : new Date().toISOString().slice(0, 10);

      const { error: ledgerError } = await supabase.from('money_ledger').insert({
        kind: 'expense',
        amount_cents: cents,
        occurred_on: paidOn,
        category: bill.kind === 'loan' ? 'loan' : (EXPENSE_CATEGORIES as readonly string[]).includes(bill.category) ? bill.category : 'other',
        method: method?.trim() || bill.pay_from || null,
        counterparty: bill.name,
        note: `Bill payment (due ${bill.next_due})`,
        source: 'bill',
      });
      if (ledgerError) throw ledgerError;

      const update: Record<string, unknown> = {};
      if (bill.kind === 'loan' && bill.balance_cents !== null) {
        const remaining = Math.max(0, bill.balance_cents - cents);
        update.balance_cents = remaining;
        update.amount_cents = remaining || bill.amount_cents;
        if (remaining === 0) update.active = false;
      } else {
        const next = rollForward(bill.next_due, bill.frequency);
        if (next) update.next_due = next; else update.active = false;
      }
      const { data: updated, error: updateError } = await supabase.from('bills').update(update).eq('id', id).select(BILL_SELECT).single();
      if (updateError) throw updateError;
      return res.status(200).json({ bill: updated, loggedCents: cents });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err: any) {
    console.error('[MoneyLedger] error:', err);
    return res.status(500).json({ error: err?.message || 'Ledger request failed' });
  }
}
