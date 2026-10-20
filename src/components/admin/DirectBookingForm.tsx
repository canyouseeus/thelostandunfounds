import { useState } from 'react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

interface DraftLineItem {
  description: string;
  quantity: string;
  unit_price: string;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const OWNER_EMAIL = 'thelostandunfounds@gmail.com';

/**
 * "Someone booked directly" — a job taken by phone or email, billed and split
 * exactly like a website booking. Posts to /api/admin/direct-booking, which
 * creates the client, invoice and Stripe link, records the job's cost and ties
 * the client to whoever referred them. The split (42% affiliate, 2%/1% MLM,
 * King Midas 8%, Secret Santa 3%) runs on profit when Stripe settles it.
 *
 * "Existing invoice" attaches cost + referrer to a job already billed, and if
 * it is already paid runs the split now — the INV-013 back-fill.
 */
export function DirectBookingForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'create' | 'attach'>('create');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftLineItem[]>([{ description: '', quantity: '1', unit_price: '' }]);
  const [cost, setCost] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [adoptCommissionId, setAdoptCommissionId] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const total = items.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);
  const costNum = parseFloat(cost) || 0;
  const profit = Math.max(0, total - costNum);
  const setItem = (i: number, patch: Partial<DraftLineItem>) =>
    setItems(prev => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/direct-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  };

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const referrer = {
        referrerCode: referrerCode.trim() || undefined,
        referrerEmail: referrerCode.trim() ? undefined : referrerEmail.trim() || undefined,
      };
      const data = mode === 'create'
        ? await post({
            action: 'create',
            clientName, clientEmail, clientPhone,
            description, eventDate: eventDate || undefined,
            lineItems: items.map(li => ({
              description: li.description,
              quantity: parseFloat(li.quantity) || 1,
              unit_price: parseFloat(li.unit_price),
            })),
            cost: cost === '' ? undefined : costNum,
            ...referrer,
          })
        : await post({
            action: 'attach',
            invoiceNumber: invoiceNumber.trim().toUpperCase(),
            cost: cost === '' ? undefined : costNum,
            adoptCommissionId: adoptCommissionId.trim() || undefined,
            ...referrer,
          });
      setResult(data);
    } catch (e: any) {
      setErr(e?.message || 'Direct booking failed');
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async (test: boolean) => {
    setInviteMsg(null);
    try {
      const data = await post({
        action: 'invite',
        referrerEmail: referrerEmail.trim(),
        referrerName: referrerName.trim() || undefined,
        testEmail: test ? OWNER_EMAIL : undefined,
      });
      setInviteMsg(data.sent
        ? `${test ? 'Test sent' : 'Invite sent'} to ${data.to}${data.cc ? ` (cc ${data.cc})` : ''}`
        : `Not sent: ${data.error || 'unknown error'}`);
    } catch (e: any) {
      setInviteMsg(e?.message || 'Invite failed');
    }
  };

  const field = 'w-full bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:bg-white/10 transition-colors';
  const label = 'block text-[9px] text-white/40 uppercase tracking-widest mb-1.5';
  const tab = (active: boolean) =>
    `px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${active ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`;

  const referral = result?.referral;
  const pending = referral?.status === 'pending_signup';

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-20 pb-16">
      <h2 className="text-xl font-black uppercase tracking-wide text-white mb-1">Direct Booking</h2>
      <p className="text-white/50 text-sm normal-case mb-6">
        Booked by phone or email — billed and split like a website booking
      </p>

      {!result && (
        <div className="space-y-5">
          <div className="flex gap-2">
            <button className={tab(mode === 'create')} onClick={() => setMode('create')}>New job</button>
            <button className={tab(mode === 'attach')} onClick={() => setMode('attach')}>Existing invoice</button>
          </div>

          {mode === 'create' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className={label}>Client name</span>
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Client email</span>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Phone (optional)</span>
                  <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Event date (optional)</span>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={field} />
                </label>
              </div>

              <label className="block">
                <span className={label}>Scope & delivery terms</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={field}
                  placeholder="e.g. Proposal photos + video edit. Photos same day, video within 7 business days."
                />
              </label>

              <div>
                <span className={label}>Line items</span>
                <div className="space-y-3">
                  {items.map((li, i) => (
                    <div key={i} className="bg-white/[0.02] p-3 grid grid-cols-[1fr_4rem_6rem_auto] gap-2 items-end">
                      <input value={li.description} onChange={(e) => setItem(i, { description: e.target.value })} className={field} placeholder="Description" />
                      <input inputMode="decimal" value={li.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} className={field} placeholder="Qty" />
                      <input inputMode="decimal" value={li.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} className={field} placeholder="Price" />
                      <button
                        onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                        disabled={items.length === 1}
                        className="p-2 text-white/30 hover:text-red-400 disabled:opacity-20 transition-colors"
                        title="Remove line"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                  >
                    <PlusCircleIcon className="w-4 h-4" /> Add line
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={label}>Invoice number</span>
                <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={field} placeholder="INV-013" />
              </label>
              <label className="block">
                <span className={label}>Existing commission id (optional)</span>
                <input value={adoptCommissionId} onChange={(e) => setAdoptCommissionId(e.target.value)} className={field} placeholder="Attach instead of writing a second one" />
              </label>
            </div>
          )}

          <label className="block">
            <span className={label}>Job cost — what this job costs us{mode === 'attach' ? ' (blank = leave as is)' : ''}</span>
            <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className={field} placeholder="e.g. 120" />
          </label>

          <div className="bg-white/[0.02] p-4 space-y-3">
            <span className={label}>Referred by (optional)</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input value={referrerCode} onChange={(e) => setReferrerCode(e.target.value)} className={field} placeholder="Affiliate code" />
              <input value={referrerEmail} onChange={(e) => setReferrerEmail(e.target.value)} disabled={!!referrerCode.trim()} className={`${field} disabled:opacity-30`} placeholder="…or their email" />
              <input value={referrerName} onChange={(e) => setReferrerName(e.target.value)} disabled={!!referrerCode.trim()} className={`${field} disabled:opacity-30`} placeholder="Their name" />
            </div>
            <p className="text-[10px] text-white/30 normal-case">
              Not an affiliate yet? Give their email — the client is credited to them the moment they sign up.
            </p>
          </div>

          {mode === 'create' && total > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-white/5 text-center">
              {[
                ['Total', total], ['Profit', profit], ['Affiliate 42%', profit * 0.42],
                ['MLM L1 2%', profit * 0.02], ['King Midas 8%', profit * 0.08], ['Secret Santa 3%', profit * 0.03],
              ].map(([k, v]) => (
                <div key={k as string} className="bg-black p-2">
                  <p className="text-[8px] text-white/40 uppercase tracking-widest">{k}</p>
                  <p className="font-mono text-xs text-white">{money(v as number)}</p>
                </div>
              ))}
            </div>
          )}

          {err && <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">{err}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={saving || (mode === 'create' ? total <= 0 || cost === '' : !invoiceNumber.trim())}
              className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create Job' : 'Attach'}
            </button>
            <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/5 text-white hover:bg-white/10 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {result.invoiceNumber && (
            <p className="text-sm text-white">
              <span className="font-bold">{result.invoiceNumber}</span>
              {result.total !== undefined && <> — {money(result.total)}, profit {money(result.profit)}</>}
            </p>
          )}
          {result.paymentLink?.url && (
            <p className="text-[11px] text-white/60 normal-case break-all">Pay link: {result.paymentLink.url}</p>
          )}
          {referral && (
            <p className="text-[10px] uppercase tracking-widest text-white/70">
              Referral: {referral.status.replace(/_/g, ' ')}{referral.code ? ` — ${referral.code}` : ''}{referral.reason ? ` — ${referral.reason}` : ''}
            </p>
          )}
          {result.commission && (
            <p className="text-[10px] uppercase tracking-widest text-white/70">
              Commission: {result.commission.triggered ? `${money(result.commission.amount || 0)} recorded` : result.commission.reason}
            </p>
          )}
          {result.next && <p className="text-[10px] text-white/40 normal-case">{result.next}</p>}

          {pending && (
            <div className="bg-white/[0.02] p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/70">
                {referral.referrerEmail} isn’t an affiliate yet — send the invite
              </p>
              <div className="flex gap-2">
                <button onClick={() => sendInvite(true)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white hover:bg-white/10">
                  Send test to me
                </button>
                <button onClick={() => sendInvite(false)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/90">
                  Send invite
                </button>
              </div>
              {inviteMsg && <p className="text-[10px] text-white/50 normal-case">{inviteMsg}</p>}
            </div>
          )}

          {(result.before || result.after) && (
            <details className="bg-white/[0.02] p-3">
              <summary className="text-[10px] uppercase tracking-widest text-white/50 cursor-pointer">Before / after rows</summary>
              <pre className="mt-2 text-[10px] text-white/60 whitespace-pre-wrap break-all">
                {JSON.stringify({ before: result.before, after: result.after }, null, 2)}
              </pre>
            </details>
          )}

          <button onClick={onDone} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-white/90">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
