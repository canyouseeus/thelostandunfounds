import { useEffect, useState } from 'react';

const money = (n: number) => `$${n.toFixed(2)}`;
const OWNER_PAY_RATE = 0.10;

/** Today in Central — a street night belongs to the night it happened. */
const centralToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

const PAY_STATUS: Record<string, string> = {
  queued: 'Pay queued',
  running: 'Paying…',
  done: 'Paid',
  waiting_funds: 'Pay waiting for Stripe balance',
  failed: 'Pay failed',
};

/**
 * Street night — one entry at the end of a night of walk-up photography.
 * Totals by how people paid; posts to /api/admin/field-sales, which records
 * it as revenue and queues the owner's 10% to his Stripe Connect account.
 * Walk-up sales carry no affiliate, King Midas or Secret Santa share.
 */
export function StreetNightForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [night, setNight] = useState(centralToday());
  const [location, setLocation] = useState('');
  const [cashApp, setCashApp] = useState('');
  const [venmo, setVenmo] = useState('');
  const [applePay, setApplePay] = useState('');
  const [cash, setCash] = useState('');
  const [saleCount, setSaleCount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [nights, setNights] = useState<any[]>([]);

  const num = (v: string) => parseFloat(v) || 0;
  const total = num(cashApp) + num(venmo) + num(applePay) + num(cash);
  const ownerPay = Math.round(total * OWNER_PAY_RATE * 100) / 100;
  // Cash in hand is deposited by hand; app balances transfer to the business.
  const toTransfer = num(cashApp) + num(venmo) + num(applePay);

  const loadNights = async () => {
    try {
      const res = await fetch('/api/admin/field-sales');
      const data = await res.json();
      if (res.ok) setNights(data.nights || []);
    } catch {
      // The list is a convenience; the form works without it.
    }
  };

  useEffect(() => { loadNights(); }, []);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/field-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          night, location: location.trim() || undefined,
          cashApp: num(cashApp), venmo: num(venmo), applePay: num(applePay), cash: num(cash),
          saleCount: saleCount === '' ? undefined : parseInt(saleCount, 10),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setResult(data);
      loadNights();
    } catch (e: any) {
      setErr(e?.message || 'Could not record the night');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors';
  const label = 'block text-[9px] text-white/40 uppercase tracking-widest mb-1.5';

  const amountInput = (name: string, value: string, set: (v: string) => void) => (
    <label className="block">
      <span className={label}>{name}</span>
      <input inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className={field} placeholder="0" />
    </label>
  );

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
      <h2 className="text-xl font-black uppercase tracking-wide text-white mb-1">Street Night</h2>
      <p className="text-white/50 text-sm normal-case mb-6">
        End-of-night totals from walk-up sales — counted as revenue, 10% paid to you
      </p>

      {!result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className={label}>Night</span>
              <input type="date" value={night} onChange={(e) => setNight(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className={label}>Where (optional)</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} placeholder="Bar or event" />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {amountInput('Cash App', cashApp, setCashApp)}
            {amountInput('Venmo', venmo, setVenmo)}
            {amountInput('Apple Pay', applePay, setApplePay)}
            {amountInput('Cash', cash, setCash)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className={label}>People sold to (optional)</span>
              <input inputMode="numeric" value={saleCount} onChange={(e) => setSaleCount(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className={label}>Notes (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </label>
          </div>

          {total > 0 && (
            <div className="grid grid-cols-3 gap-px bg-white/5">
              {[
                ['Night total', total],
                ['Your pay 10%', ownerPay],
                ['Business keeps', total - ownerPay],
              ].map(([k, v]) => (
                <div key={k as string} className="bg-black p-3">
                  <p className="text-[8px] text-white/40 uppercase tracking-widest">{k}</p>
                  <p className="font-mono text-sm text-white">{money(v as number)}</p>
                </div>
              ))}
            </div>
          )}

          {err && <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">{err}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={saving || total <= 0 || !night}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Record Night'}
            </button>
            <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-white">
            <span className="font-bold">{money(result.total)}</span> recorded for {result.sale?.night}
            {result.sale?.location ? ` at ${result.sale.location}` : ''}.
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/70">
            Your pay: {money(result.ownerPay)} — {PAY_STATUS[result.payJob?.status] || 'not queued'}
          </p>
          {toTransfer > 0 && (
            <div className="bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Next</p>
              <p className="text-sm text-white normal-case mt-1">
                Transfer {money(toTransfer)} from Cash App / Venmo / Apple Cash to the Business account (••0515).
                {num(cash) > 0 && ` Deposit the ${money(num(cash))} cash too.`}
              </p>
            </div>
          )}
          <button onClick={onDone} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90">
            Done
          </button>
        </div>
      )}

      {nights.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3">Recent nights</p>
          <div className="space-y-px">
            {nights.map((n) => (
              <div key={n.id} className="bg-white/[0.02] px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{n.night}{n.location ? ` · ${n.location}` : ''}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    {PAY_STATUS[n.pay?.status] || 'No pay queued'} · {money(Number(n.owner_pay))}
                  </p>
                </div>
                <p className="font-mono text-sm text-white shrink-0">{money(Number(n.total))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
