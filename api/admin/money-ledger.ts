import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveVerifiedAdmin } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Money in and money out, in one place.
 *
 *   GET                         → ledger entries + a monthly income/expense summary
 *   POST { action: 'create' }   → log one entry (a Venmo payment, a gear purchase)
 *   POST { action: 'import' }   → log many, skipping any source_ref already stored
 *   DELETE ?id=                 → remove an entry logged by mistake
 *
 *   GET ?view=bills             → active bills and loans only (the calendar's red dots)
 *   POST { action: 'bill-save' }→ add or edit a bill / loan
 *   POST { action: 'bill-paid' }→ log the payment as an expense, roll next_due forward,
 *                                 and for a loan, pay down the balance
 *   DELETE ?bill=               → stop tracking a bill
 *
 * The summary folds in what the site already records — gallery sales, invoice
 * payments, photographer payouts, print costs — so the ledger only has to hold
 * what the site never sees: direct payments and expenses.
 *
 * Financial records, so the gate is a verified Supabase session, not the
 * spoofable x-admin-email header that `isAdmin` accepts.
 */

export const INCOME_CATEGORIES = ['photos', 'services', 'other'] as const;
export const EXPENSE_CATEGORIES = ['gear', 'software', 'website', 'loan', 'travel', 'crew', 'prints', 'marketing', 'fees', 'other'] as const;
export const BILL_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;
const BILL_FREQUENCIES = ['monthly', 'yearly', 'once'] as const;
const BILL_SELECT = 'id, name, kind, category, amount_cents, balance_cents, frequency, next_due, priority, pay_from, notes, active';

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

async function authorized(req: VercelRequest): Promise<boolean> {
  const secret = req.headers['x-admin-secret'];
  if (secret && secret === process.env.ADMIN_SECRET) return true;
  const host = req.headers.host || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) return true;
  return (await resolveVerifiedAdmin(req)) !== null;
}

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
    },
  };
}

interface Line { month: string; kind: 'income' | 'expense'; category: string; cents: number; origin: 'site' | 'ledger' }

async function buildSummary(supabase: ReturnType<typeof getSupabaseAdmin>, ledger: any[]) {
  const [gallery, payments, prodigi] = await Promise.all([
    supabase.from('photo_orders').select('email, total_amount_cents, payment_status, created_at'),
    supabase.from('invoice_payments').select('amount, paid_at, invoice_id, invoices ( description, contractor_payout )'),
    supabase.from('prodigi_orders').select('unit_cost, copies, status, paid_at').not('status', 'eq', 'cancelled'),
  ]);

  const lines: Line[] = [];
  const month = (at: string | null) => (at ?? '').slice(0, 7);

  for (const o of gallery.data ?? []) {
    if (!paidish(o.payment_status) || TEST_EMAIL.test(o.email ?? '')) continue;
    lines.push({ month: month(o.created_at), kind: 'income', category: 'photos', cents: o.total_amount_cents ?? 0, origin: 'site' });
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
    lines.push({ month: month(e.occurred_on), kind: e.kind, category: e.category, cents: e.amount_cents, origin: 'ledger' });
  }

  const months = new Map<string, { month: string; incomeCents: number; expenseCents: number; photoIncomeCents: number }>();
  const byCategory = { income: {} as Record<string, number>, expense: {} as Record<string, number> };
  let siteIncome = 0, ledgerIncome = 0;
  for (const l of lines) {
    if (!l.month || l.cents <= 0) continue;
    const m = months.get(l.month) ?? { month: l.month, incomeCents: 0, expenseCents: 0, photoIncomeCents: 0 };
    if (l.kind === 'income') {
      m.incomeCents += l.cents;
      if (l.category === 'photos') m.photoIncomeCents += l.cents;
      if (l.origin === 'site') siteIncome += l.cents; else ledgerIncome += l.cents;
    } else {
      m.expenseCents += l.cents;
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
    },
    byCategory,
    monthly,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await authorized(req))) return res.status(401).json({ error: 'Unauthorized' });
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
        .select('id, kind, amount_cents, occurred_on, category, method, counterparty, note, source, source_ref, created_at')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const [summary, bills] = await Promise.all([
        buildSummary(supabase, data ?? []),
        supabase.from('bills').select(BILL_SELECT).eq('active', true).order('next_due'),
      ]);
      if (bills.error) throw bills.error;
      return res.status(200).json({
        entries: data ?? [],
        bills: bills.data ?? [],
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
