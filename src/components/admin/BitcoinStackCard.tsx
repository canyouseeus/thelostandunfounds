import { useEffect, useState } from 'react';
import { LoadingSpinner } from '../Loading';
import { supabase } from '../../lib/supabase';

/**
 * The Bitcoin app in the Platform Console. Its first section is the owner's
 * bitcoin stack: what the site paid him (his 10% and his own
 * affiliate pay), which Strike auto-buys as bitcoin on arrival, and his
 * Strike balance when STRIKE_STACK_READ_KEY is set. Data from
 * /api/admin/bitcoin-stack, read only.
 */

interface Month { month: string; ownerCut: number; affiliate: number; total: number }
interface Inflow { at: string; kind: 'owner_cut' | 'affiliate'; amount: number; label: string }
type Strike =
  | { connected: true; btc: number; stacksBtc: number; priceUsd: number | null }
  | { connected: false; reason: 'not_configured' | 'key_rejected' | 'unavailable'; status?: number };

export interface BitcoinStack {
  inflows: {
    total: number; ownerCut: number; affiliate: number;
    thisMonth: number; thisMonthKey: string;
    months: Month[]; recent: Inflow[];
  };
  strike: Strike;
  autoWithdrawBtc: number;
}

const SATS = 100_000_000;
const TARGET_KEY = 'lu.bitcoin.monthlySatsTarget';

// One request shared by the tile face and its panel.
let pending: Promise<BitcoinStack> | null = null;
function loadStack(force = false): Promise<BitcoinStack> {
  if (!pending || force) {
    pending = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/bitcoin-stack', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      return body as BitcoinStack;
    })();
    pending.catch(() => { pending = null; });
  }
  return pending;
}

function useBitcoinStack() {
  const [data, setData] = useState<BitcoinStack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = (force = false) => {
    setLoading(true);
    loadStack(force)
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e?.message || 'Could not load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  return { data, error, loading, reload: () => load(true) };
}

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sats = (btc: number) => Math.round(btc * SATS).toLocaleString();
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function readTarget(): number {
  try { return Number(localStorage.getItem(TARGET_KEY)) || 0; } catch { return 0; }
}
function writeTarget(v: number) {
  try { localStorage.setItem(TARGET_KEY, String(v)); } catch { /* private mode */ }
}

function StrikeMissing({ strike }: { strike: Extract<Strike, { connected: false }> }) {
  const text = strike.reason === 'not_configured'
    ? 'Strike balance not connected. Add your read-only Strike key in Vercel as STRIKE_STACK_READ_KEY, then redeploy.'
    : strike.reason === 'key_rejected'
      ? 'Strike turned the key down. Check that STRIKE_STACK_READ_KEY has the balances and rates read scopes.'
      : `Strike didn't answer just now${strike.status ? ` (${strike.status})` : ''}. Try again in a minute.`;
  return <div className="bg-white/5 p-4 text-xs text-white/60 normal-case">{text}</div>;
}

export function BitcoinStackPanel() {
  const { data, error, loading, reload } = useBitcoinStack();
  const [target, setTarget] = useState<number>(() => readTarget());

  if (loading && !data) return <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (error || !data) {
    return (
      <div className="py-16 text-center text-white/40 text-xs uppercase font-bold tracking-widest">
        {error || 'Could not load'} · <button className="underline" onClick={reload}>Retry</button>
      </div>
    );
  }

  const { inflows, strike, autoWithdrawBtc } = data;
  const price = strike.connected ? strike.priceUsd : null;
  // Strike buys at each deposit's price, which the site never sees, so this
  // month's sats are an estimate at today's price.
  const monthSatsEstimate = price ? Math.round((inflows.thisMonth / price) * SATS) : null;
  const withdrawPct = strike.connected ? Math.min(100, (strike.btc / autoWithdrawBtc) * 100) : 0;
  const targetPct = target > 0 && monthSatsEstimate !== null ? Math.min(100, (monthSatsEstimate / target) * 100) : null;

  return (
    <div className="w-full space-y-10 pt-2">
      <p className="text-white/50 text-sm normal-case">
        Your 10% and your affiliate pay go to your Stripe account, which pays out daily to Strike.
        Strike buys bitcoin with all of it on arrival, about two days after the dates below.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Paid to you, all time" value={usd(inflows.total)} />
        <Stat label={`This month (${monthLabel(inflows.thisMonthKey)})`} value={usd(inflows.thisMonth)} />
        <Stat label="Owner 10%" value={usd(inflows.ownerCut)} />
        <Stat label="Affiliate pay" value={usd(inflows.affiliate)} />
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">In Strike</h3>
        {strike.connected ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat label="Bitcoin held" value={`${sats(strike.btc)} sats`} accent />
              <Stat label="Worth now" value={price ? usd(strike.btc * price) : 'Price unavailable'} />
              {strike.stacksBtc > 0 && <Stat label="In Strike Stacks" value={`${sats(strike.stacksBtc)} sats`} />}
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest mb-1">
                <span>Toward auto-withdraw ({autoWithdrawBtc} BTC)</span>
                <span>{withdrawPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-white/10"><div className="h-2 bg-amber-400" style={{ width: `${withdrawPct}%` }} /></div>
              <p className="text-[10px] text-white/30 mt-1 normal-case">
                Once auto-withdraw is on in Strike, the whole balance goes to your wallet at this mark, so this resets.
              </p>
            </div>
          </>
        ) : (
          <StrikeMissing strike={strike} />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Monthly sats target</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            value={target || ''}
            placeholder="e.g. 50000"
            onChange={e => { const v = Math.max(0, Math.round(Number(e.target.value) || 0)); setTarget(v); writeTarget(v); }}
            className="w-40 bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono"
            aria-label="Monthly sats target"
          />
          <span className="text-xs text-white/50 normal-case">
            {target <= 0
              ? 'Set a target to track this month against it.'
              : monthSatsEstimate === null
                ? 'Connect Strike to estimate this month in sats.'
                : `About ${monthSatsEstimate.toLocaleString()} sats this month at today's price (${targetPct!.toFixed(0)}%).`}
          </span>
        </div>
      </div>

      {inflows.months.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">By month</h3>
          {inflows.months.map(m => (
            <div key={m.month} className="flex items-center justify-between gap-4 bg-white/5 px-4 py-3">
              <span className="text-xs text-white/70">{monthLabel(m.month)}</span>
              <span className="text-[10px] text-white/40 normal-case">10% {usd(m.ownerCut)} · affiliate {usd(m.affiliate)}</span>
              <span className="text-sm font-mono font-bold text-amber-400">{usd(m.total)}</span>
            </div>
          ))}
        </div>
      )}

      {inflows.recent.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Latest payments to you</h3>
          {inflows.recent.map((r, i) => (
            <div key={`${r.at}-${i}`} className="flex items-center justify-between gap-4 bg-white/5 px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs text-white/70 truncate">{r.label}</div>
                <div className="text-[10px] text-white/30 mt-1">{new Date(r.at).toLocaleString(undefined, { timeZone: 'America/Chicago' })}</div>
              </div>
              <span className="text-sm font-mono font-bold text-white shrink-0">{usd(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 p-4">
      <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-black font-mono ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

/** The bitcoin sign (₿) as a stroke icon, sized like the dock's heroicons. */
export function BitcoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 5h6.5a3 3 0 0 1 0 6H8.5" />
      <path d="M8.5 11h6a3.5 3.5 0 0 1 0 7H7" />
      <path d="M8.5 5v13" />
      <path d="M10.5 3v2M13.5 3v2M10.5 18v2.5M13.5 18v2.5" />
    </svg>
  );
}

type Section = 'stack' | 'inheritance';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'stack', label: 'Stack' },
  { id: 'inheritance', label: 'Inheritance' },
];

/** The Bitcoin app: the stack now, the inheritance plan once it is worked out. */
export function BitcoinApp() {
  const [section, setSection] = useState<Section>('stack');
  return (
    <div className="w-full space-y-8">
      <div className="flex gap-2" role="tablist">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${section === s.id ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === 'stack' ? (
        <BitcoinStackPanel />
      ) : (
        // Placeholder until the inheritance plan is decided.
        <div className="bg-white/5 p-6 text-sm text-white/60 normal-case">
          Your inheritance plan will live here once it is worked out.
        </div>
      )}
    </div>
  );
}
