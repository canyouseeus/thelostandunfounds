/**
 * Deposit check-in.
 *
 * Venmo and Cash App cashouts land in the Stripe business account with no
 * record of what they were for. Two places to say so:
 *
 *  - DepositCheckInModal: after the dashboard's tour pop-ups are done, asks
 *    about each unsorted deposit — DIRECT INVOICE or STREET.
 *  - DepositAccounting: every deposit, its tag, and a switch to change it
 *    when the wrong button was hit. Lives in Money In / Out.
 *
 * Invoice money is already counted once, as the invoice payment, so tagging a
 * deposit invoice adds nothing to revenue. Street money has no other record,
 * so a street deposit is counted as street revenue. Either way, the first tag
 * queues 10% to the owner's Stripe Connect account (bitcoin DCA), once. See
 * lib/api-handlers/admin/deposits.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { logApiCall, logError } from '../../lib/adminErrorLog';
import { cn } from '../ui/utils';

export type DepositCategory = 'invoice' | 'street';

export interface Deposit {
  id: string;
  amount_cents: number;
  received_at: string;
  descriptor: string | null;
  sender: string | null;
  category: DepositCategory | null;
  classified_at: string | null;
  owner_pay_cents: number | null;
  pay: { status: string; error: string | null } | null;
}

interface DepositsResponse {
  deposits: Deposit[];
  pending: Deposit[];
  totals: { invoiceCents: number; streetCents: number; unsortedCents: number };
  syncError: string | null;
}

const ENDPOINT = '/api/admin/deposits';
/** Fired after any tag changes, so every view of the deposits reloads. */
export const DEPOSITS_CHANGED_EVENT = 'tlu:deposits-changed';
const SNOOZE_KEY = 'tlu_deposit_checkin_snoozed';

export const CATEGORY_LABEL: Record<DepositCategory, string> = { invoice: 'Direct invoice', street: 'Street' };

const PAY_STATUS: Record<string, string> = {
  queued: 'Queued', pending: 'Queued', running: 'Sending', waiting_funds: 'Waiting for funds', done: 'Sent', failed: 'Failed',
};

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });

async function authFetch(init: RequestInit = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(ENDPOINT, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  logApiCall(init.method || 'GET', ENDPOINT, res.status, res.ok ? 'ok' : body?.error || 'failed');
  if (!res.ok) throw new Error(body?.error || 'Request failed');
  return body;
}

export async function tagDeposit(id: string, category: DepositCategory): Promise<Deposit> {
  const body = await authFetch({ method: 'POST', body: JSON.stringify({ id, category }) });
  window.dispatchEvent(new CustomEvent(DEPOSITS_CHANGED_EVENT));
  return body.deposit;
}

/** Deposits, reloaded whenever a tag changes anywhere on the page. */
function useDeposits() {
  const [data, setData] = useState<DepositsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await authFetch());
      setError(null);
    } catch (e: any) {
      setError(e.message);
      logError(`Deposits: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(DEPOSITS_CHANGED_EVENT, load);
    return () => window.removeEventListener(DEPOSITS_CHANGED_EVENT, load);
  }, [load]);

  return { data, error, reload: load };
}

function TagButtons({
  value, onPick, busy, large,
}: { value: DepositCategory | null; onPick: (c: DepositCategory) => void; busy?: boolean; large?: boolean }) {
  return (
    <div className={cn('flex gap-2', large ? 'flex-col sm:flex-row' : '')}>
      {(['invoice', 'street'] as const).map(c => (
        <button
          key={c}
          type="button"
          disabled={busy}
          onClick={() => onPick(c)}
          data-tour={large ? `deposit-checkin-${c}` : undefined}
          aria-pressed={value === c}
          className={cn(
            'font-black uppercase transition-colors disabled:opacity-50',
            large ? 'flex-1 px-6 py-4 text-sm tracking-[0.2em]' : 'px-3 py-2 text-[10px] tracking-widest',
            value === c ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white hover:text-black',
          )}
          style={{ borderRadius: 0 }}
        >
          {CATEGORY_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

/**
 * Mounted through WhatsNewModal's `after` slot, so it only shows once no
 * walkthrough is running and nothing is left to announce.
 */
export function DepositCheckInModal() {
  const { data } = useDeposits();
  const [snoozed, setSnoozed] = useState(() => {
    try { return sessionStorage.getItem(SNOOZE_KEY) === '1'; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = data?.pending[0];
  if (!deposit || snoozed) return null;
  const left = data!.pending.length;

  const pick = async (category: DepositCategory) => {
    setBusy(true);
    setError(null);
    try {
      await tagDeposit(deposit.id, category);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    try { sessionStorage.setItem(SNOOZE_KEY, '1'); } catch { /* private mode */ }
    setSnoozed(true);
  };

  return createPortal(
    <div
      data-sage-chrome
      className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-checkin-title"
    >
      <div className="w-full max-w-md bg-black p-8 text-left" style={{ borderRadius: 0 }}>
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-green-400 mb-4">
          <BanknotesIcon className="w-4 h-4" />
          Deposit check-in{left > 1 ? ` · ${left} to sort` : ''}
        </p>
        <h2 id="deposit-checkin-title" className="text-2xl font-black uppercase tracking-widest text-white mb-2">
          {usd(deposit.amount_cents)}
        </h2>
        <p className="text-sm text-white/70 mb-1">
          {deposit.descriptor || 'Bank deposit'} · {when(deposit.received_at)}
        </p>
        <p className="text-sm text-white/70 leading-relaxed mb-8">
          This landed in the business account. Was it money from a direct invoice, or from the street?
        </p>
        <TagButtons value={null} onPick={pick} busy={busy} large />
        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
        <button
          onClick={later}
          className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
        >
          Later
        </button>
        <p className="mt-6 text-xs text-white/40 leading-relaxed">
          Invoice money is already counted on its invoice, so it is not counted twice. Street money counts toward
          Street. Either way, 10% ({usd(Math.round(deposit.amount_cents * 0.1))}) goes to your Stripe account for the
          bitcoin DCA. Picked the wrong one? Switch it in Money In / Out → Deposits.
        </p>
      </div>
    </div>,
    document.body
  );
}

/** Every outside deposit and its tag, with a switch for each. */
export function DepositAccounting() {
  const { data, error } = useDeposits();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const pick = async (d: Deposit, category: DepositCategory) => {
    if (d.category === category) return;
    setBusyId(d.id);
    setRowError(null);
    try {
      await tagDeposit(d.id, category);
    } catch (e: any) {
      setRowError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const retryPay = async (d: Deposit) => {
    setBusyId(d.id);
    setRowError(null);
    try {
      await authFetch({ method: 'POST', body: JSON.stringify({ id: d.id, retryPay: true }) });
      window.dispatchEvent(new CustomEvent(DEPOSITS_CHANGED_EVENT));
    } catch (e: any) {
      setRowError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3" data-tour="money-deposits">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Deposits</h3>
      <p className="text-xs text-white/50 leading-relaxed">
        Venmo and Cash App money that landed in the business account. Direct invoice: already counted on its invoice,
        not counted again. Street: counted as street revenue. Tagging one queues 10% to your Stripe account for the
        bitcoin DCA, once — switching the tag later does not send it again. Tap the other button to switch one.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {data?.syncError && <p className="text-xs text-amber-500">Could not check Stripe for new deposits: {data.syncError}</p>}
      {rowError && <p className="text-xs text-red-400">{rowError}</p>}

      {data && (
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Direct invoice', data.totals.invoiceCents, 'text-white'],
            ['Street', data.totals.streetCents, 'text-green-400'],
            ['Unsorted', data.totals.unsortedCents, data.totals.unsortedCents > 0 ? 'text-amber-500' : 'text-white/40'],
          ].map(([label, cents, color]) => (
            <div key={label as string} className="bg-white/5 p-3" style={{ borderRadius: 0 }}>
              <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
              <div className={cn('text-lg font-black tabular-nums', color as string)}>{usd(cents as number)}</div>
            </div>
          ))}
        </div>
      )}

      {!data && !error && <p className="text-xs text-white/40">Loading deposits…</p>}
      {data && data.deposits.length === 0 && <p className="text-xs text-white/40">No outside deposits yet.</p>}

      <div className="space-y-1">
        {data?.deposits.map(d => (
          <div
            key={d.id}
            data-tour="money-deposit-row"
            className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/5 px-3 py-2"
            style={{ borderRadius: 0 }}
          >
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-bold text-white tabular-nums">
                {usd(d.amount_cents)}
                {!d.category && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-amber-500">Unsorted</span>}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 truncate">
                {when(d.received_at)} · {d.descriptor || d.sender || 'Bank deposit'}
              </div>
              {d.owner_pay_cents != null && (
                <div className={cn('text-[10px] uppercase tracking-widest', d.pay?.status === 'failed' ? 'text-red-400' : 'text-white/40')}>
                  10% DCA {usd(d.owner_pay_cents)} · {PAY_STATUS[d.pay?.status ?? ''] ?? 'Queued'}
                  {(d.pay?.status === 'failed' || d.pay?.status === 'waiting_funds') && d.pay.error ? ` — ${d.pay.error}` : ''}
                </div>
              )}
            </div>
            {d.pay?.status === 'failed' && (
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => retryPay(d)}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-black transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                Retry 10%
              </button>
            )}
            <TagButtons value={d.category} onPick={c => pick(d, c)} busy={busyId === d.id} />
          </div>
        ))}
      </div>
    </section>
  );
}
