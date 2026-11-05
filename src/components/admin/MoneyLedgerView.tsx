/**
 * Money In / Money Out
 *
 * Income and expenses on one page. Site income (gallery sales, invoice
 * payments) and site costs (photographer payouts, print orders) come in on
 * their own; the form below covers what the site never sees — a Venmo payment
 * for photos, a lens, a software subscription. Bills and loans sit on top,
 * ordered by priority, and land on the admin calendar as red dots.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logApiCall, logError } from '../../lib/adminErrorLog';
import { cn } from '../ui/utils';
import { DepositAccounting } from './DepositCheckIn';
import { type Bill, type BillPriority, daysUntil, PRIORITY_ORDER, PRIORITY_TEXT } from '../../lib/bills';

interface Entry {
    id: string;
    kind: 'income' | 'expense';
    amount_cents: number;
    occurred_on: string;
    category: string;
    method: string | null;
    counterparty: string | null;
    note: string | null;
    source: string;
}

interface Summary {
    totals: { incomeCents: number; expenseCents: number; netCents: number; photoIncomeCents: number; siteIncomeCents: number; directIncomeCents: number };
    byCategory: { income: Record<string, number>; expense: Record<string, number> };
    monthly: { month: string; incomeCents: number; expenseCents: number; photoIncomeCents: number }[];
}

interface LedgerResponse {
    entries: Entry[];
    bills: Bill[];
    summary: Summary;
    categories: { income: string[]; expense: string[] };
}

const ENDPOINT = '/api/admin/money-ledger';
const METHODS = ['Venmo', 'Cash App', 'Zelle', 'Cash', 'Card', 'Bank', 'Other'];
const surface = { borderRadius: 0 } as const;
const input = 'w-full bg-white/5 text-white text-sm px-3 py-2 focus:bg-white/10 transition-colors outline-none';

const usd = (cents: number) =>
    `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const today = () => new Date().toISOString().slice(0, 10);

async function authFetch(url: string, init: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
            ...(init.headers || {}),
        },
    });
    const body = await res.json().catch(() => ({}));
    logApiCall(init.method || 'GET', url, res.status, res.ok ? 'ok' : body?.error || 'failed');
    if (!res.ok) throw new Error(body?.error || 'Request failed');
    return body;
}

/** Label · bar on a shared scale · value — the dashboard's bar dialect. */
function Bar({ label, cents, max, accent }: { label: string; cents: number; max: number; accent: string }) {
    return (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest tabular-nums">
            <span className="w-20 shrink-0 text-white/40 truncate">{label}</span>
            <span className={cn('relative flex-1 h-1.5', accent)}>
                <span className="absolute inset-0 bg-current opacity-10" />
                <span className="absolute top-0 bottom-0 left-0 bg-current" style={{ width: `${max > 0 ? (cents / max) * 100 : 0}%` }} />
            </span>
            <span className="w-24 shrink-0 text-right font-bold text-white">{usd(cents)}</span>
        </div>
    );
}

function dueLabel(ymd: string) {
    const n = daysUntil(ymd);
    if (n < 0) return `${-n}d overdue`;
    if (n === 0) return 'Due today';
    if (n === 1) return 'Due tomorrow';
    return `Due in ${n}d`;
}

const emptyBill = { name: '', kind: 'bill' as 'bill' | 'loan', amount: '', balance: '', frequency: 'monthly', next_due: '', priority: 'normal' as BillPriority, pay_from: '', notes: '' };

/** Bills and loans, most urgent first: priority, then due date. */
function BillsSection({ bills, onChange, onError }: { bills: Bill[]; onChange: () => Promise<void>; onError: (m: string) => void }) {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState(emptyBill);
    const [busy, setBusy] = useState<string | null>(null);

    const sorted = [...bills].sort((a, b) =>
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || a.next_due.localeCompare(b.next_due));
    const dueIn30 = bills
        .filter(b => daysUntil(b.next_due) <= 30)
        .reduce((n, b) => n + (b.amount_cents ?? 0), 0);

    const run = async (key: string, fn: () => Promise<unknown>) => {
        setBusy(key);
        try { await fn(); await onChange(); } catch (err: any) { logError(err.message); onError(err.message); } finally { setBusy(null); }
    };

    const markPaid = (b: Bill) => {
        let amount: string | null = b.amount_cents ? (b.amount_cents / 100).toFixed(2) : '';
        amount = window.prompt(`Amount paid for ${b.name}?`, amount);
        if (amount === null) return;
        run(b.id, () => authFetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'bill-paid', id: b.id, amount }) }));
    };

    const setPriority = (b: Bill, priority: BillPriority) =>
        run(b.id, () => authFetch(ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({
                action: 'bill-save',
                bill: { ...b, priority, amount: b.amount_cents ? b.amount_cents / 100 : '', balance: b.balance_cents ? b.balance_cents / 100 : '' },
            }),
        }));

    const stop = (b: Bill) => {
        if (!window.confirm(`Stop tracking ${b.name}? Payments already logged stay in the ledger.`)) return;
        run(b.id, () => authFetch(`${ENDPOINT}?bill=${encodeURIComponent(b.id)}`, { method: 'DELETE' }));
    };

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        run('new', async () => {
            await authFetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'bill-save', bill: draft }) });
            setDraft(emptyBill);
            setAdding(false);
        });
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    Bills &amp; loans · {usd(dueIn30)} due in 30 days
                </h3>
                <button
                    onClick={() => setAdding(v => !v)}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    style={surface}
                >
                    {adding ? 'Cancel' : 'Add bill'}
                </button>
            </div>

            {adding && (
                <form onSubmit={save} className="bg-white/5 p-4 grid grid-cols-2 md:grid-cols-4 gap-2" style={surface}>
                    <input className={cn(input, 'col-span-2')} style={surface} required placeholder="Name (e.g. Zoho Mail)"
                        value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                    <select className={input} style={surface} value={draft.kind}
                        onChange={e => setDraft(d => ({ ...d, kind: e.target.value as 'bill' | 'loan', frequency: e.target.value === 'loan' ? 'once' : d.frequency }))}>
                        <option value="bill" className="bg-black">Bill</option>
                        <option value="loan" className="bg-black">Loan</option>
                    </select>
                    <select className={input} style={surface} value={draft.priority}
                        onChange={e => setDraft(d => ({ ...d, priority: e.target.value as BillPriority }))}>
                        {PRIORITY_ORDER.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
                    </select>
                    <input className={input} style={surface} type="number" step="0.01" min="0.01" placeholder="Amount"
                        value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
                    {draft.kind === 'loan' && (
                        <input className={input} style={surface} type="number" step="0.01" min="0.01" placeholder="Balance owed"
                            value={draft.balance} onChange={e => setDraft(d => ({ ...d, balance: e.target.value }))} />
                    )}
                    <input className={input} style={surface} type="date" required
                        value={draft.next_due} onChange={e => setDraft(d => ({ ...d, next_due: e.target.value }))} />
                    <select className={input} style={surface} value={draft.frequency}
                        onChange={e => setDraft(d => ({ ...d, frequency: e.target.value }))}>
                        <option value="monthly" className="bg-black">Monthly</option>
                        <option value="yearly" className="bg-black">Yearly</option>
                        <option value="once" className="bg-black">One time</option>
                    </select>
                    <input className={input} style={surface} placeholder="Paid from"
                        value={draft.pay_from} onChange={e => setDraft(d => ({ ...d, pay_from: e.target.value }))} />
                    <input className={cn(input, 'col-span-2')} style={surface} placeholder="Notes"
                        value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
                    <button type="submit" disabled={busy === 'new'}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                        style={surface}>
                        Save
                    </button>
                </form>
            )}

            {sorted.length === 0 ? (
                <p className="text-xs text-white/40">No bills tracked yet.</p>
            ) : (
                <div className="space-y-1">
                    {sorted.map(b => {
                        const overdueOrSoon = daysUntil(b.next_due) <= 3;
                        return (
                            <div key={b.id} className={cn('px-3 py-3 text-xs space-y-1', overdueOrSoon ? 'bg-red-400/10' : 'bg-white/5')} style={surface}>
                                <div className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
                                    <span className="flex-1 min-w-0 truncate font-bold text-white">{b.name}</span>
                                    <select
                                        value={b.priority}
                                        disabled={busy === b.id}
                                        onChange={e => setPriority(b, e.target.value as BillPriority)}
                                        className={cn('bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer', PRIORITY_TEXT[b.priority])}
                                        title="Priority"
                                    >
                                        {PRIORITY_ORDER.map(p => <option key={p} value={p} className="bg-black text-white">{p}</option>)}
                                    </select>
                                    <span className="w-20 text-right font-bold tabular-nums text-white">
                                        {b.amount_cents ? usd(b.amount_cents) : 'TBD'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 pl-[18px] text-[10px] uppercase tracking-widest text-white/40">
                                    <span className={cn(overdueOrSoon && 'text-red-400 font-bold')}>{dueLabel(b.next_due)} · {b.next_due}</span>
                                    <span>{b.kind === 'loan' ? `Loan${b.balance_cents !== null ? ` · ${usd(b.balance_cents)} left` : ''}` : b.frequency}</span>
                                    {b.pay_from && <span>From {b.pay_from}</span>}
                                    <span className="flex-1" />
                                    <button onClick={() => markPaid(b)} disabled={busy === b.id}
                                        className="font-bold text-white/70 hover:text-white transition-colors disabled:opacity-50">
                                        Mark paid
                                    </button>
                                    <button onClick={() => stop(b)} disabled={busy === b.id}
                                        className="text-white/30 hover:text-red-400 transition-colors">
                                        Stop
                                    </button>
                                </div>
                                {b.notes && <p className="pl-[18px] text-[11px] text-white/50 normal-case">{b.notes}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function Stat({ label, cents, accent }: { label: string; cents: number; accent?: string }) {
    return (
        <div className="bg-white/5 p-4 text-left" style={surface}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">{label}</p>
            <p className={cn('text-xl font-black tabular-nums', accent || 'text-white')}>{usd(cents)}</p>
        </div>
    );
}

interface StripeBalances {
    balance: { available: number; pending: number };
    financialAccounts: { id: string; name: string; available: number; inboundPending: number; outboundPending: number }[];
    financialAccountsError: string | null;
}

const dollars = (d: number) => usd(Math.round(d * 100));

/** Live Stripe money: the Payments balance (card income) and every financial account. */
function StripeBalancesSection() {
    const [data, setData] = useState<StripeBalances | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await authFetch('/api/admin/stripe-balance'));
            setError(null);
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const accounts = data?.financialAccounts ?? [];
    const total = data ? data.balance.available + data.balance.pending + accounts.reduce((n, a) => n + a.available, 0) : 0;

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    Stripe balances{data ? ` · ${dollars(total)} total` : ''}
                </h3>
                <button
                    onClick={load}
                    disabled={loading}
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                    style={surface}
                >
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>
            {error && <p className="bg-red-500/10 text-red-400 text-xs p-3">{error}</p>}
            {!data && !error && <p className="text-white/40 text-xs uppercase tracking-widest">Loading Stripe…</p>}
            {data && (
                <>
                    <div data-tour="money-stripe-payments" className="grid grid-cols-2 gap-2">
                        <Stat label="Payments · available" cents={Math.round(data.balance.available * 100)} accent="text-green-400" />
                        <Stat label="Payments · pending" cents={Math.round(data.balance.pending * 100)} accent="text-white/60" />
                    </div>
                    <div data-tour="money-stripe-accounts" className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {accounts.map(a => (
                            <div key={a.id} className="bg-white/5 p-4 text-left" style={surface}>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1 truncate">{a.name}</p>
                                <p className="text-xl font-black tabular-nums text-white">{dollars(a.available)}</p>
                                {(a.inboundPending > 0 || a.outboundPending > 0) && (
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 tabular-nums">
                                        {a.inboundPending > 0 && `+${dollars(a.inboundPending)} coming`}
                                        {a.inboundPending > 0 && a.outboundPending > 0 && ' · '}
                                        {a.outboundPending > 0 && `−${dollars(a.outboundPending)} going out`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    {data.financialAccountsError && (
                        <p className="text-[10px] uppercase tracking-widest text-red-400">Financial accounts: {data.financialAccountsError}</p>
                    )}
                </>
            )}
        </section>
    );
}

export default function MoneyLedgerView() {
    const [data, setData] = useState<LedgerResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [form, setForm] = useState({
        kind: 'income' as 'income' | 'expense',
        amount: '',
        occurred_on: today(),
        category: 'photos',
        method: 'Venmo',
        counterparty: '',
        note: '',
    });

    const load = useCallback(async () => {
        try {
            setData(await authFetch(ENDPOINT));
            setError(null);
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const setKind = (kind: 'income' | 'expense') =>
        setForm(f => ({ ...f, kind, category: kind === 'income' ? 'photos' : 'gear' }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await authFetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'create', entry: form }) });
            setForm(f => ({ ...f, amount: '', counterparty: '', note: '' }));
            await load();
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (entry: Entry) => {
        if (!window.confirm(`Remove ${usd(entry.amount_cents)} ${entry.kind} from ${entry.occurred_on}?`)) return;
        try {
            await authFetch(`${ENDPOINT}?id=${encodeURIComponent(entry.id)}`, { method: 'DELETE' });
            await load();
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        }
    };

    if (!data && !error) return <p className="text-white/40 text-xs uppercase tracking-widest p-4">Loading ledger…</p>;

    const s = data?.summary;
    const thisMonth = s?.monthly.find(m => m.month === today().slice(0, 7));
    const monthMax = Math.max(1, ...(s?.monthly ?? []).flatMap(m => [m.incomeCents, m.expenseCents]));
    const incomeCats = Object.entries(s?.byCategory.income ?? {}).sort((a, b) => b[1] - a[1]);
    const expenseCats = Object.entries(s?.byCategory.expense ?? {}).sort((a, b) => b[1] - a[1]);
    const catMax = Math.max(1, ...incomeCats.map(c => c[1]), ...expenseCats.map(c => c[1]));
    const entries = (data?.entries ?? []).filter(e => filter === 'all' || e.kind === filter);
    const categories = data?.categories[form.kind] ?? [];

    return (
        <div className="space-y-8 text-left">
            {error && <p className="bg-red-500/10 text-red-400 text-xs p-3">{error}</p>}

            <StripeBalancesSection />

            {data && <BillsSection bills={data.bills ?? []} onChange={load} onError={setError} />}

            <DepositAccounting />

            {s && (
                <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">All time</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Stat label="Money in" cents={s.totals.incomeCents} accent="text-green-400" />
                        <Stat label="From photos" cents={s.totals.photoIncomeCents} accent="text-green-400" />
                        <Stat label="Money out" cents={s.totals.expenseCents} />
                        <Stat label="Net" cents={s.totals.netCents} accent={s.totals.netCents < 0 ? 'text-red-400' : 'text-white'} />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">
                        This month: {usd(thisMonth?.incomeCents ?? 0)} in · {usd(thisMonth?.expenseCents ?? 0)} out
                        {' · '}Site {usd(s.totals.siteIncomeCents)} · Direct {usd(s.totals.directIncomeCents)}
                    </p>
                </section>
            )}

            {/* Add entry */}
            <form onSubmit={save} className="bg-white/5 p-4 space-y-3" style={surface}>
                <div className="flex gap-2">
                    {(['income', 'expense'] as const).map(k => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setKind(k)}
                            className={cn(
                                'px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
                                form.kind === k ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white hover:text-black',
                            )}
                            style={surface}
                        >
                            {k === 'income' ? 'Money in' : 'Money out'}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input className={input} style={surface} type="number" step="0.01" min="0.01" required placeholder="Amount"
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                    <input className={input} style={surface} type="date" required
                        value={form.occurred_on} onChange={e => setForm(f => ({ ...f, occurred_on: e.target.value }))} />
                    <select className={input} style={surface} value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        {categories.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                    </select>
                    <select className={input} style={surface} value={form.method}
                        onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                        {METHODS.map(m => <option key={m} value={m} className="bg-black">{m}</option>)}
                    </select>
                    <input className={cn(input, 'col-span-2')} style={surface} placeholder={form.kind === 'income' ? 'Who paid' : 'Paid to'}
                        value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} />
                    <input className={cn(input, 'col-span-2')} style={surface} placeholder="Note"
                        value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    style={surface}
                >
                    {saving ? 'Saving…' : 'Add'}
                </button>
            </form>

            {s && s.monthly.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">By month</h3>
                    <div className="space-y-4">
                        {s.monthly.map(m => (
                            <div key={m.month} className="space-y-1.5">
                                <div className="flex justify-between text-xs uppercase tracking-widest">
                                    <span className="font-bold text-white">{monthLabel(m.month)}</span>
                                    <span className={cn('font-bold tabular-nums', m.incomeCents - m.expenseCents < 0 ? 'text-red-400' : 'text-white/60')}>
                                        Net {usd(m.incomeCents - m.expenseCents)}
                                    </span>
                                </div>
                                <Bar label="In" cents={m.incomeCents} max={monthMax} accent="text-green-400" />
                                <Bar label="Photos" cents={m.photoIncomeCents} max={monthMax} accent="text-green-400" />
                                <Bar label="Out" cents={m.expenseCents} max={monthMax} accent="text-white" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {s && (incomeCats.length > 0 || expenseCats.length > 0) && (
                <section className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Money in by category</h3>
                        {incomeCats.map(([c, cents]) => <Bar key={c} label={c} cents={cents} max={catMax} accent="text-green-400" />)}
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Money out by category</h3>
                        {expenseCats.length === 0
                            ? <p className="text-xs text-white/40">No expenses logged yet.</p>
                            : expenseCats.map(([c, cents]) => <Bar key={c} label={c} cents={cents} max={catMax} accent="text-white" />)}
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Logged entries</h3>
                    <div className="flex gap-1">
                        {(['all', 'income', 'expense'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    'px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                                    filter === f ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white',
                                )}
                                style={surface}
                            >
                                {f === 'all' ? 'All' : f === 'income' ? 'In' : 'Out'}
                            </button>
                        ))}
                    </div>
                </div>
                {entries.length === 0 ? (
                    <p className="text-xs text-white/40">
                        Nothing logged yet. Site sales and invoice payments are already counted above.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {entries.map(e => (
                            <div key={e.id} className="group flex items-center gap-3 bg-white/5 px-3 py-2 text-xs" style={surface}>
                                <span className="w-20 shrink-0 text-white/40 tabular-nums">{e.occurred_on}</span>
                                <span className="flex-1 min-w-0 truncate text-white">
                                    {e.counterparty || e.note || e.category}
                                    <span className="text-white/40"> · {e.category}{e.method ? ` · ${e.method}` : ''}</span>
                                </span>
                                <span className={cn('shrink-0 font-bold tabular-nums', e.kind === 'income' ? 'text-green-400' : 'text-white')}>
                                    {e.kind === 'income' ? '+' : '−'}{usd(e.amount_cents)}
                                </span>
                                <button
                                    onClick={() => remove(e)}
                                    className="shrink-0 text-[10px] uppercase tracking-widest text-white/30 hover:text-red-400 transition-colors"
                                    title="Remove entry"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
