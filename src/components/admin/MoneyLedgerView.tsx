/**
 * Money In / Money Out
 *
 * Income and expenses on one page. Site income (gallery, shop, tickets,
 * street, invoice payments), site costs (photographer payouts, prints,
 * refunds) and Stripe's money out (business card spending, Stripe fees,
 * commissions, owner pay) come in on their own; the form covers what neither
 * sees — a Venmo payment for photos, a cash purchase. Bills and loans sit on
 * top, ordered by priority, and land on the admin calendar as red dots.
 *
 * Under the balances: in and out for a chosen period beside the one before,
 * cash against bills and spending (runway), and a tax set-aside estimate.
 *
 * Venmo and Cash App card spending comes in from their emails. Every logged
 * entry is business or personal: both count as money out for cash and runway,
 * only business counts for profit and the tax set-aside. Venmo and Cash App
 * balances are set by hand, since no email states them. Bitcoin buys and
 * sells sit in their own section, outside money in and out.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logApiCall, logError } from '../../lib/adminErrorLog';
import { cn } from '../ui/utils';
import { DepositAccounting } from './DepositCheckIn';
import { type Bill, type BillPriority, daysUntil, dueDatesInRange, PRIORITY_ORDER, PRIORITY_TEXT } from '../../lib/bills';

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
    scope: 'business' | 'personal';
}

interface Month { month: string; incomeCents: number; expenseCents: number; photoIncomeCents: number; ownerPayCents: number; personalExpenseCents: number }

interface Account { id: string; name: string; balance_cents: number; as_of: string; notes: string | null }

interface BitcoinRow {
    id: string; occurred_on: string; platform: string; action: 'buy' | 'sell' | 'withdraw' | 'receive' | 'bonus';
    usd_cents: number; fee_cents: number; sats: number | null; note: string | null; source: string;
}

interface CardSpend { id: string; day: string; merchant: string; category: string; cents: number }

interface AcquisitionMonth { month: string; spendCents: number; upkeepCents: number; newCustomers: number; newAffiliates: number }

interface Acquisition {
    spendCents: number; newCustomers: number; costPerCustomerCents: number | null; newAffiliates: number;
    upkeepCents: number; costPerCustomerWithUpkeepCents: number | null;
    channels: {
        affiliates: { spendCents: number; customers: number };
        marketing: { spendCents: number };
        kingMidas: { spendCents: number };
        website: { spendCents: number };
        organic: { customers: number };
    };
    ownerCommissionCents: number;
    monthly: AcquisitionMonth[];
}

interface Summary {
    totals: {
        incomeCents: number; expenseCents: number; netCents: number; photoIncomeCents: number;
        siteIncomeCents: number; directIncomeCents: number; stripeExpenseCents: number; ownerPayCents: number;
        personalExpenseCents: number; transfersCents?: number;
    };
    byCategory: { income: Record<string, number>; expense: Record<string, number> };
    monthly: Month[];
    cardSpend: CardSpend[];
    stripeError: string | null;
    acquisition?: Acquisition | null;
    acquisitionError?: string | null;
}

interface LedgerResponse {
    entries: Entry[];
    bills: Bill[];
    accounts: Account[];
    bitcoin: BitcoinRow[];
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

/** Today as YYYY-MM-DD on the viewer's own clock (the owner is on Central time). */
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** YYYY-MM shifted by n months. */
const shiftMonth = (ym: string, n: number) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const addDays = (ymd: string, n: number) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** owner_pay → owner pay */
const catLabel = (c: string) => c.replace(/_/g, ' ');

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
            <span className="w-20 shrink-0 text-white/40 truncate">{catLabel(label)}</span>
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

/**
 * Money the business can spend: the Payments balance plus the Business
 * financial account. King Midas, Secret Santa and Affiliate pay hold money
 * already owed to other people, so runway leaves them out.
 */
const spendableCents = (d: StripeBalances) =>
    Math.round((d.balance.available + d.balance.pending + d.financialAccounts
        .filter(a => a.name === 'Business')
        .reduce((n, a) => n + a.available, 0)) * 100);

interface SweepPlanView {
    trigger: string;
    skipped?: string;
    fingerprint?: string;
    plan?: { availableCents: number; reservedCents: number; moves: { to: 'king_midas' | 'secret_santa' | 'business'; cents: number }[]; held: string[] };
    queued: { to: string; amount: number; duplicate?: boolean }[];
}

const POT_LABEL: Record<string, string> = { king_midas: 'KING MIDAS', secret_santa: 'Secret Santa', business: 'Business' };

/**
 * "Sweep now": the same split the webhook and the 4:30 PM run do, on demand.
 * First press shows exactly what would move; nothing moves until Confirm, and
 * Confirm only queues those amounts (the server refuses if the numbers changed).
 */
function SweepNowSection({ onDone }: { onDone: () => void }) {
    const [preview, setPreview] = useState<SweepPlanView | null>(null);
    const [requestId, setRequestId] = useState('');
    const [busy, setBusy] = useState<'plan' | 'run' | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPlan = async () => {
        setBusy('plan');
        setError(null);
        setMessage(null);
        try {
            setPreview(await authFetch('/api/admin/balance-sweep'));
            setRequestId(crypto.randomUUID());
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logError(msg);
            setError(msg);
        } finally {
            setBusy(null);
        }
    };

    const confirm = async () => {
        if (!preview?.fingerprint || !requestId) return;
        setBusy('run');
        setError(null);
        try {
            const run: SweepPlanView = await authFetch('/api/admin/balance-sweep', {
                method: 'POST',
                body: JSON.stringify({ fingerprint: preview.fingerprint, requestId }),
            });
            setPreview(null);
            if (run.skipped) setMessage(`Nothing moved: ${run.skipped}.`);
            else if (!run.queued.length) setMessage('Nothing to move right now.');
            else setMessage(`Queued ${run.queued.map(q => `${usd(Math.round(q.amount * 100))} to ${POT_LABEL[q.to] || q.to}`).join(', ')}. Stripe moves it within a minute.`);
            onDone();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logError(msg);
            setError(msg);
            // The numbers changed or the request failed: show a fresh plan to confirm.
            setPreview(null);
        } finally {
            setBusy(null);
        }
    };

    const moves = preview?.plan?.moves ?? [];

    return (
        <div data-tour="money-sweep-now" className="bg-white/5 p-4 space-y-3 text-left" style={surface}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Split and sweep the available balance to the pots and business
                </p>
                {!preview && (
                    <button
                        onClick={loadPlan}
                        disabled={busy !== null}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/80 transition-colors disabled:opacity-50 shrink-0"
                    >
                        {busy === 'plan' ? 'Checking…' : 'Sweep now'}
                    </button>
                )}
            </div>
            {preview && (
                <div className="space-y-2">
                    {preview.skipped && <p className="text-xs text-amber-400">Can't sweep yet: {preview.skipped}.</p>}
                    {preview.plan && (
                        <p className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
                            {usd(preview.plan.availableCents)} available · {usd(preview.plan.reservedCents)} held for money owed
                        </p>
                    )}
                    {moves.length > 0 ? (
                        <ul className="space-y-1">
                            {moves.map(m => (
                                <li key={m.to} className="flex justify-between text-sm text-white tabular-nums">
                                    <span>{POT_LABEL[m.to]}</span>
                                    <span className="font-black">{usd(m.cents)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !preview.skipped && <p className="text-xs text-white/60">Nothing to move right now.</p>
                    )}
                    {(preview.plan?.held ?? []).map(h => (
                        <p key={h} className="text-[10px] uppercase tracking-widest text-white/40">{h}</p>
                    ))}
                    <div className="flex gap-2 pt-1">
                        {moves.length > 0 && !preview.skipped && (
                            <button
                                onClick={confirm}
                                disabled={busy !== null}
                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-green-500 text-black hover:bg-green-400 transition-colors disabled:opacity-50"
                            >
                                {busy === 'run' ? 'Queueing…' : `Confirm ${usd(moves.reduce((n, m) => n + m.cents, 0))}`}
                            </button>
                        )}
                        <button
                            onClick={() => setPreview(null)}
                            disabled={busy !== null}
                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {message && <p className="text-xs text-green-400">{message}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

/** Live Stripe money: the Payments balance (card income) and every financial account. */
function StripeBalancesSection({ onLoaded }: { onLoaded?: (_balances: StripeBalances) => void }) {
    const [data, setData] = useState<StripeBalances | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const fresh: StripeBalances = await authFetch('/api/admin/stripe-balance');
            setData(fresh);
            onLoaded?.(fresh);
            setError(null);
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [onLoaded]);

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
                    <SweepNowSection onDone={load} />
                </>
            )}
        </section>
    );
}

const sumMonths = (monthly: Month[], keep: (_ym: string) => boolean) => {
    const rows = monthly.filter(m => keep(m.month));
    const inC = rows.reduce((n, m) => n + m.incomeCents, 0);
    const outC = rows.reduce((n, m) => n + m.expenseCents, 0);
    const owner = rows.reduce((n, m) => n + m.ownerPayCents, 0);
    const personal = rows.reduce((n, m) => n + (m.personalExpenseCents ?? 0), 0);
    return { inC, outC, net: inC - outC, owner, personal };
};

/** The last three whole months, not counting this one. */
function threeMonthAverage(monthly: Month[], thisMonth: string) {
    const window = [1, 2, 3].map(n => shiftMonth(thisMonth, -n));
    const t = sumMonths(monthly, ym => window.includes(ym));
    return { inC: Math.round(t.inC / 3), outC: Math.round(t.outC / 3), net: Math.round(t.net / 3) };
}

/** Cash on hand against what is coming due, and how long it lasts. */
function RunwaySection({ cashCents, bills, monthly }: { cashCents: number | null; bills: Bill[]; monthly: Month[] }) {
    const now = today();
    const avg = threeMonthAverage(monthly, now.slice(0, 7));
    // Overdue bills are still owed, so every window counts them.
    const dueWithin = (days: number) => bills.reduce((n, b) =>
        n + dueDatesInRange(b, '0000-01-01', addDays(now, days)).length * (b.amount_cents ?? 0), 0);
    const windows = [30, 60, 90].map(d => ({ days: d, cents: dueWithin(d) }));
    const months = cashCents !== null && avg.outC > 0 ? cashCents / avg.outC : null;

    return (
        <section data-tour="money-runway" className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Cash and runway</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Spendable cash</p>
                    <p className="text-xl font-black tabular-nums text-white">{cashCents === null ? '…' : usd(cashCents)}</p>
                </div>
                {windows.map(w => (
                    <div key={w.days} className="bg-white/5 p-4 text-left" style={surface}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Bills due · {w.days} days</p>
                        <p className="text-xl font-black tabular-nums text-white">{usd(w.cents)}</p>
                        {cashCents !== null && (
                            <p className={cn('text-[10px] uppercase tracking-widest mt-1 tabular-nums', cashCents - w.cents < 0 ? 'text-red-400 font-bold' : 'text-white/40')}>
                                {usd(cashCents - w.cents)} left
                            </p>
                        )}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Avg in · last 3 months" cents={avg.inC} accent="text-green-400" />
                <Stat label="Avg out · last 3 months" cents={avg.outC} />
                <Stat label="Avg net · last 3 months" cents={avg.net} accent={avg.net < 0 ? 'text-red-400' : 'text-white'} />
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Cash lasts</p>
                    <p className="text-xl font-black tabular-nums text-white">
                        {months === null ? '—' : months >= 24 ? '24+ months' : `${months.toFixed(1)} months`}
                    </p>
                </div>
            </div>
            <p className="text-[11px] text-white/40 text-left">
                Cash lasts is spendable cash divided by average monthly money out, personal spending included, with no new
                income. Spendable cash is the Payments balance, the Business account and the Venmo and Cash App balances you
                set below. King Midas, Secret Santa and Affiliate pay are left out, because that money is owed to other people.
            </p>
        </section>
    );
}

type PeriodId = 'month' | 'last' | 'ytd' | '12m' | 'all';
const PERIODS: { id: PeriodId; label: string }[] = [
    { id: 'month', label: 'This month' },
    { id: 'last', label: 'Last month' },
    { id: 'ytd', label: 'Year to date' },
    { id: '12m', label: '12 months' },
    { id: 'all', label: 'All time' },
];

/** The months in a period, and the period it is compared with. */
function periodRange(id: PeriodId, thisMonth: string): { keep: (_ym: string) => boolean; prior: ((_ym: string) => boolean) | null; priorLabel: string } {
    const year = thisMonth.slice(0, 4);
    const monthNo = thisMonth.slice(5, 7);
    switch (id) {
        case 'month': {
            const prev = shiftMonth(thisMonth, -1);
            return { keep: ym => ym === thisMonth, prior: ym => ym === prev, priorLabel: 'all of last month' };
        }
        case 'last': {
            const last = shiftMonth(thisMonth, -1);
            const before = shiftMonth(thisMonth, -2);
            return { keep: ym => ym === last, prior: ym => ym === before, priorLabel: 'the month before' };
        }
        case 'ytd': {
            const lastYear = String(Number(year) - 1);
            return {
                keep: ym => ym.startsWith(year) && ym <= thisMonth,
                prior: ym => ym.startsWith(lastYear) && ym.slice(5, 7) <= monthNo,
                priorLabel: `the same months of ${lastYear}`,
            };
        }
        case '12m': {
            const start = shiftMonth(thisMonth, -11);
            const priorStart = shiftMonth(thisMonth, -23);
            return { keep: ym => ym >= start && ym <= thisMonth, prior: ym => ym >= priorStart && ym < start, priorLabel: 'the 12 months before' };
        }
        default:
            return { keep: () => true, prior: null, priorLabel: '' };
    }
}

function Delta({ now, before, invert }: { now: number; before: number; invert?: boolean }) {
    const diff = now - before;
    if (!diff) return <span className="text-white/40">same</span>;
    const good = invert ? diff < 0 : diff > 0;
    return <span className={good ? 'text-green-400' : 'text-red-400'}>{diff > 0 ? '+' : ''}{usd(diff)}</span>;
}

/** In, out and net for a chosen period, beside the period before it. */
function PeriodSection({ s }: { s: Summary }) {
    const [period, setPeriod] = useState<PeriodId>('month');
    const thisMonth = today().slice(0, 7);
    const range = periodRange(period, thisMonth);
    const cur = sumMonths(s.monthly, range.keep);
    const prior = range.prior ? sumMonths(s.monthly, range.prior) : null;

    return (
        <section data-tour="money-period" className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Money in and out</h3>
                <div className="flex gap-1 flex-wrap">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={cn(
                                'px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                                period === p.id ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white',
                            )}
                            style={surface}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Money in" cents={cur.inC} accent="text-green-400" />
                <Stat label="Money out" cents={cur.outC} />
                <Stat label="Net" cents={cur.net} accent={cur.net < 0 ? 'text-red-400' : 'text-white'} />
                <Stat label="Of which owner pay" cents={cur.owner} accent="text-white/60" />
            </div>
            {cur.personal > 0 && (
                <p className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
                    Money out includes {usd(cur.personal)} tagged personal. It counts for cash, not for profit or tax.
                </p>
            )}
            {prior && (
                <p className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
                    Vs {range.priorLabel}: in <Delta now={cur.inC} before={prior.inC} />
                    {' · '}out <Delta now={cur.outC} before={prior.outC} invert />
                    {' · '}net <Delta now={cur.net} before={prior.net} />
                </p>
            )}
            <p className="text-[10px] uppercase tracking-widest text-white/40">
                All time: site {usd(s.totals.siteIncomeCents)} · direct {usd(s.totals.directIncomeCents)} · Stripe money out {usd(s.totals.stripeExpenseCents)}
                {(s.totals.transfersCents ?? 0) > 0 && <> · moved to your own accounts, not counted {usd(s.totals.transfersCents ?? 0)}</>}
            </p>
            {s.stripeError && (
                <p className="bg-red-500/10 text-red-400 text-xs p-3">
                    Money out is missing Stripe card spending and fees right now: {s.stripeError}
                </p>
            )}
        </section>
    );
}

const TAX_RATE_KEY = 'tlu_tax_set_aside_rate';

function readRate(): number {
    try {
        const n = Number(window.localStorage.getItem(TAX_RATE_KEY));
        return Number.isFinite(n) && n > 0 && n < 100 ? n : 25;
    } catch { return 25; }
}

/** What to keep aside for taxes on this year's profit, at a rate the owner sets. */
function TaxSection({ monthly }: { monthly: Month[] }) {
    const [rate, setRate] = useState<number>(readRate);
    const year = today().slice(0, 4);
    const ytd = sumMonths(monthly, ym => ym.startsWith(year));
    // Owner pay is the owner's draw and personal spending is not a business
    // cost, so both are added back.
    const profit = ytd.net + ytd.owner + ytd.personal;
    const setAside = Math.max(0, Math.round(profit * rate / 100));

    const change = (v: string) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n >= 100) return;
        setRate(n);
        try { window.localStorage.setItem(TAX_RATE_KEY, String(n)); } catch { /* the rate just resets next visit */ }
    };

    return (
        <section data-tour="money-tax" className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tax set-aside · {year}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Profit so far" cents={profit} accent={profit < 0 ? 'text-red-400' : 'text-white'} />
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Rate</p>
                    <div className="flex items-center gap-1">
                        <input
                            type="number" min="0" max="99" step="1" value={rate}
                            onChange={e => change(e.target.value)}
                            className="w-16 bg-white/10 text-white text-xl font-black tabular-nums px-2 outline-none"
                            style={surface}
                            aria-label="Tax set-aside rate in percent"
                        />
                        <span className="text-xl font-black text-white/60">%</span>
                    </div>
                </div>
                <Stat label="Set aside" cents={setAside} accent="text-amber-500" />
            </div>
            <p className="text-[11px] text-white/40 text-left">
                An estimate, not tax advice. Profit is money in minus business money out for {year}. Owner pay and anything
                tagged personal are left out, because they are not business costs. Check the rate with whoever does your taxes.
            </p>
        </section>
    );
}

/** Spend to win customers ÷ new customers, all time and by month. */
function AcquisitionSection({ a, error }: { a: Acquisition | null | undefined; error: string | null | undefined }) {
    // The website brings people in, so its upkeep counts by default.
    const [withUpkeep, setWithUpkeep] = useState(true);
    if (!a) {
        return error ? (
            <section data-tour="money-acquisition" className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Cost per new customer</h3>
                <p className="bg-red-500/10 text-red-400 text-xs p-3">Cost per new customer is missing right now: {error}</p>
            </section>
        ) : null;
    }
    const per = (spend: number, n: number) => (n ? usd(Math.round(spend / n)) : '—');
    const recent = a.monthly.slice(0, 6);
    const perCustomer = withUpkeep ? a.costPerCustomerWithUpkeepCents : a.costPerCustomerCents;
    const spent = withUpkeep ? a.spendCents + a.upkeepCents : a.spendCents;
    const upkeepMonths = a.monthly.filter(m => m.upkeepCents > 0).length;
    return (
        <section data-tour="money-acquisition" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Cost per new customer · all time</h3>
                <button
                    type="button"
                    data-tour="money-acquisition-upkeep"
                    onClick={() => setWithUpkeep(v => !v)}
                    aria-pressed={withUpkeep}
                    className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 ${withUpkeep ? 'bg-white text-black' : 'bg-white/5 text-white/60'}`}
                    style={surface}
                >
                    {withUpkeep ? 'Website upkeep counted' : 'Acquisition only'}
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Per customer</p>
                    <p className="text-xl font-black tabular-nums text-white">{perCustomer === null ? '—' : usd(perCustomer)}</p>
                </div>
                <Stat label={withUpkeep ? 'Spent, with upkeep' : 'Spent to get them'} cents={spent} accent="text-white/60" />
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">New customers</p>
                    <p className="text-xl font-black tabular-nums text-white">{a.newCustomers.toLocaleString('en-US')}</p>
                </div>
                <div className="bg-white/5 p-4 text-left" style={surface}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">New affiliates</p>
                    <p className="text-xl font-black tabular-nums text-white">{a.newAffiliates.toLocaleString('en-US')}</p>
                </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
                Affiliates {usd(a.channels.affiliates.spendCents)} for {a.channels.affiliates.customers} · {per(a.channels.affiliates.spendCents, a.channels.affiliates.customers)} each
                {' · '}KING MIDAS {usd(a.channels.kingMidas.spendCents)}
                {' · '}marketing {usd(a.channels.marketing.spendCents)}
                {withUpkeep && <>{' · '}website {usd(a.channels.website.spendCents)}{upkeepMonths ? ` (${usd(Math.round(a.channels.website.spendCents / upkeepMonths))} a month)` : ''}</>}
                {' · '}everyone else {a.channels.organic.customers} at $0.00
            </p>
            {recent.length > 0 && (
                <div data-tour="money-acquisition-months" className="space-y-1">
                    {recent.map(m => {
                        const mSpent = withUpkeep ? m.spendCents + m.upkeepCents : m.spendCents;
                        return (
                            <div key={m.month} className="flex items-center gap-3 text-[10px] uppercase tracking-widest tabular-nums bg-white/5 px-3 py-2" style={surface}>
                                <span className="w-20 shrink-0 text-white/40">{monthLabel(m.month)}</span>
                                <span className="flex-1 text-white/60">
                                    {usd(mSpent)} spent{withUpkeep && m.upkeepCents ? ` (${usd(m.upkeepCents)} website)` : ''} · {m.newCustomers} new{m.newAffiliates ? ` · ${m.newAffiliates} affiliate${m.newAffiliates === 1 ? '' : 's'}` : ''}
                                </span>
                                <span className="w-20 shrink-0 text-right font-bold text-white">{per(mSpent, m.newCustomers)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
            <p className="text-[11px] text-white/40 text-left">
                Spend is commissions and MLM shares paid to other affiliates, KING MIDAS once paid, and anything logged as business
                marketing. Website upkeep is business software and website costs in money out: Vercel and Supabase on the Stripe card,
                and anything logged as software or website. Charges billed through Apple, like Claude and Google storage, only count
                once they are logged. Your own affiliate code pays you, so its {usd(a.ownerCommissionCents)} is left out. A customer counts once,
                in the month they first paid. Venmo and Cash App only give a name, so someone who also paid an invoice counts twice.
            </p>
        </section>
    );
}

const DEFAULT_ACCOUNTS = ['Venmo', 'Cash App'];

/**
 * Balances the site cannot read, set by hand with the day they were true.
 * No Venmo or Cash App email states a balance, so these are never guessed.
 */
function AccountsSection({ accounts, onChange, onError }: { accounts: Account[]; onChange: () => Promise<void>; onError: (_m: string) => void }) {
    const names = [...new Set([...DEFAULT_ACCOUNTS, ...accounts.map(a => a.name)])];
    const [draft, setDraft] = useState<Record<string, { balance: string; as_of: string }>>({});
    const [saving, setSaving] = useState<string | null>(null);

    const save = async (name: string) => {
        const d = draft[name];
        if (!d || d.balance === '') return;
        setSaving(name);
        try {
            await authFetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'account-save', account: { name, balance: d.balance, as_of: d.as_of || today() } }) });
            setDraft(x => { const n = { ...x }; delete n[name]; return n; });
            await onChange();
        } catch (err: any) {
            logError(err.message);
            onError(err.message);
        } finally {
            setSaving(null);
        }
    };

    return (
        <section data-tour="money-accounts" className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Venmo and Cash App balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {names.map(name => {
                    const a = accounts.find(x => x.name === name);
                    const d = draft[name];
                    const stale = a ? daysUntil(a.as_of) < -7 : false;
                    return (
                        <div key={name} className="bg-white/5 p-4 space-y-2" style={surface}>
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{name}</p>
                                <p className={cn('text-[10px] uppercase tracking-widest', stale ? 'text-amber-500' : 'text-white/40')}>
                                    {a ? `as of ${a.as_of}` : 'not set'}
                                </p>
                            </div>
                            <p className={cn('text-xl font-black tabular-nums', a && a.balance_cents < 0 ? 'text-red-400' : 'text-white')}>
                                {a ? usd(a.balance_cents) : '—'}
                            </p>
                            <div className="flex gap-2">
                                <input className={input} style={surface} type="number" step="0.01" placeholder="New balance"
                                    aria-label={`${name} balance`}
                                    value={d?.balance ?? ''}
                                    onChange={e => setDraft(x => ({ ...x, [name]: { balance: e.target.value, as_of: x[name]?.as_of ?? today() } }))} />
                                <input className={input} style={surface} type="date" aria-label={`${name} balance date`}
                                    value={d?.as_of ?? today()}
                                    onChange={e => setDraft(x => ({ ...x, [name]: { balance: x[name]?.balance ?? '', as_of: e.target.value } }))} />
                                <button
                                    onClick={() => save(name)}
                                    disabled={!d || d.balance === '' || saving === name}
                                    className="shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
                                    style={surface}
                                >
                                    {saving === name ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-[11px] text-white/40 text-left">
                Their emails show spending but never a balance, so type what each app shows. These add to spendable cash.
            </p>
        </section>
    );
}

const btcLabel: Record<BitcoinRow['action'], string> = { buy: 'Bought', sell: 'Sold', withdraw: 'Sent out', receive: 'Received', bonus: 'Bonus' };

/**
 * Bitcoin from Cash App and Venmo emails, outside money in and out: buying is
 * not spending and selling is not income. Withdrawals are moves between the
 * owner's own wallets, so they show here but count in neither total.
 */
function BitcoinSection({ rows }: { rows: BitcoinRow[] }) {
    if (rows.length === 0) return null;
    const year = today().slice(0, 4);
    const ytd = rows.filter(r => r.occurred_on.startsWith(year));
    const sum = (list: BitcoinRow[], action: BitcoinRow['action'], f: (_r: BitcoinRow) => number) =>
        list.filter(r => r.action === action).reduce((n, r) => n + f(r), 0);
    // A Cash App buy is the purchase amount plus the fee; a sale is the sale
    // amount before the fee (Venmo's emails give the amount after it).
    const bought = sum(ytd, 'buy', r => r.usd_cents + r.fee_cents);
    const sold = sum(ytd, 'sell', r => r.usd_cents - r.fee_cents);
    const fees = ytd.reduce((n, r) => n + r.fee_cents, 0);
    const putIn = bought - sold;

    return (
        <section data-tour="money-bitcoin" className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Bitcoin · {year}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Bought, with fees" cents={bought} />
                <Stat label="Sold, after fees" cents={sold} accent="text-green-400" />
                <Stat label="Fees paid" cents={fees} accent="text-amber-500" />
                <Stat label={putIn >= 0 ? 'Net cash put in' : 'Net cash taken out'} cents={Math.abs(putIn)} accent="text-white/60" />
            </div>
            <div className="space-y-1">
                {rows.slice(0, 15).map(r => (
                    <div key={r.id} className="flex items-center gap-3 bg-white/5 px-3 py-2 text-xs" style={surface}>
                        <span className="w-20 shrink-0 text-white/40 tabular-nums">{r.occurred_on}</span>
                        <span className="flex-1 min-w-0 truncate text-white">
                            {btcLabel[r.action]}
                            <span className="text-white/40">
                                {' · '}{r.platform}
                                {r.sats ? ` · ${r.sats.toLocaleString('en-US')} sats` : ''}
                                {r.fee_cents ? ` · ${usd(r.fee_cents)} fee` : ''}
                            </span>
                        </span>
                        <span className={cn('shrink-0 font-bold tabular-nums', r.action === 'sell' ? 'text-green-400' : 'text-white')}>
                            {r.usd_cents ? usd(r.usd_cents) : '—'}
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-white/40 text-left">
                From your Cash App and Venmo emails. Not counted in money in or out, profit or tax.
            </p>
        </section>
    );
}

/** Business card purchases Stripe recorded, newest first. */
function CardSpendSection({ rows }: { rows: CardSpend[] }) {
    if (rows.length === 0) return null;
    return (
        <section data-tour="money-card-spend" className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Business card spending</h3>
            <div className="space-y-1">
                {rows.map(r => (
                    <div key={r.id} className="flex items-center gap-3 bg-white/5 px-3 py-2 text-xs" style={surface}>
                        <span className="w-20 shrink-0 text-white/40 tabular-nums">{r.day}</span>
                        <span className="flex-1 min-w-0 truncate text-white">
                            {r.merchant}
                            <span className="text-white/40"> · {catLabel(r.category)}</span>
                        </span>
                        <span className={cn('shrink-0 font-bold tabular-nums', r.cents < 0 ? 'text-green-400' : 'text-white')}>
                            {r.cents < 0 ? '+' : '−'}{usd(Math.abs(r.cents))}
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-white/40 text-left">
                Pulled from Stripe on its own. The category is a guess from the merchant type.
            </p>
        </section>
    );
}

export default function MoneyLedgerView() {
    const [data, setData] = useState<LedgerResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'personal'>('all');
    const [stripeCashCents, setStripeCashCents] = useState<number | null>(null);
    const onBalances = useCallback((d: StripeBalances) => setStripeCashCents(spendableCents(d)), []);
    const [form, setForm] = useState({
        kind: 'income' as 'income' | 'expense',
        amount: '',
        occurred_on: today(),
        category: 'photos',
        method: 'Venmo',
        counterparty: '',
        note: '',
        scope: 'business' as 'business' | 'personal',
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
        setForm(f => ({ ...f, kind, category: kind === 'income' ? 'photos' : 'gear', scope: 'business' }));

    const flipScope = async (entry: Entry) => {
        try {
            await authFetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ action: 'scope', id: entry.id, scope: entry.scope === 'personal' ? 'business' : 'personal' }) });
            await load();
        } catch (err: any) {
            logError(err.message);
            setError(err.message);
        }
    };

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
    const monthMax = Math.max(1, ...(s?.monthly ?? []).flatMap(m => [m.incomeCents, m.expenseCents]));
    const incomeCats = Object.entries(s?.byCategory.income ?? {}).sort((a, b) => b[1] - a[1]);
    const expenseCats = Object.entries(s?.byCategory.expense ?? {}).sort((a, b) => b[1] - a[1]);
    const catMax = Math.max(1, ...incomeCats.map(c => c[1]), ...expenseCats.map(c => c[1]));
    const entries = (data?.entries ?? []).filter(e =>
        filter === 'all' || (filter === 'personal' ? e.scope === 'personal' : e.kind === filter));
    const accountCents = (data?.accounts ?? []).reduce((n, a) => n + a.balance_cents, 0);
    const cashCents = stripeCashCents === null ? null : stripeCashCents + accountCents;
    const categories = data?.categories[form.kind] ?? [];

    return (
        <div className="space-y-8 text-left">
            {error && <p className="bg-red-500/10 text-red-400 text-xs p-3">{error}</p>}

            <StripeBalancesSection onLoaded={onBalances} />

            {s && <PeriodSection s={s} />}

            {data && <AccountsSection accounts={data.accounts ?? []} onChange={load} onError={setError} />}

            {s && data && <RunwaySection cashCents={cashCents} bills={data.bills ?? []} monthly={s.monthly} />}

            {data && <BillsSection bills={data.bills ?? []} onChange={load} onError={setError} />}

            {s && <TaxSection monthly={s.monthly} />}
            {s && <AcquisitionSection a={s.acquisition} error={s.acquisitionError} />}

            <DepositAccounting />

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
                        {categories.map(c => <option key={c} value={c} className="bg-black">{catLabel(c)}</option>)}
                    </select>
                    <select className={input} style={surface} value={form.method}
                        onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                        {METHODS.map(m => <option key={m} value={m} className="bg-black">{m}</option>)}
                    </select>
                    {form.kind === 'expense' && (
                        <select className={input} style={surface} value={form.scope} aria-label="Business or personal"
                            onChange={e => setForm(f => ({ ...f, scope: e.target.value as 'business' | 'personal' }))}>
                            <option value="business" className="bg-black">Business</option>
                            <option value="personal" className="bg-black">Personal</option>
                        </select>
                    )}
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

            {s && <CardSpendSection rows={s.cardSpend ?? []} />}

            {data && <BitcoinSection rows={data.bitcoin ?? []} />}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Logged entries</h3>
                    <div className="flex gap-1">
                        {(['all', 'income', 'expense', 'personal'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    'px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                                    filter === f ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white',
                                )}
                                style={surface}
                            >
                                {f === 'all' ? 'All' : f === 'income' ? 'In' : f === 'expense' ? 'Out' : 'Personal'}
                            </button>
                        ))}
                    </div>
                </div>
                {entries.length === 0 ? (
                    <p className="text-xs text-white/40">
                        Nothing logged yet. Site sales, invoice payments and Stripe money out are already counted above.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {entries.map(e => (
                            <div key={e.id} className="group flex items-center gap-3 bg-white/5 px-3 py-2 text-xs" style={surface}>
                                <span className="w-20 shrink-0 text-white/40 tabular-nums">{e.occurred_on}</span>
                                <span className="flex-1 min-w-0 truncate text-white">
                                    {e.counterparty || e.note || e.category}
                                    <span className="text-white/40"> · {catLabel(e.category)}{e.method ? ` · ${e.method}` : ''}</span>
                                </span>
                                {e.kind === 'expense' && (
                                    <button
                                        onClick={() => flipScope(e)}
                                        data-tour="money-scope"
                                        className={cn(
                                            'shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
                                            e.scope === 'personal' ? 'bg-white/10 text-white/50 hover:text-white' : 'bg-white text-black hover:bg-white/60',
                                        )}
                                        style={surface}
                                        title={e.scope === 'personal' ? 'Personal: counts for cash, not profit. Tap for business.' : 'Business: counts for profit and tax. Tap for personal.'}
                                    >
                                        {e.scope === 'personal' ? 'Personal' : 'Business'}
                                    </button>
                                )}
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
